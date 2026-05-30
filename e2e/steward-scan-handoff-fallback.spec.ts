import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

import { encodeStewardHandoffCode } from "../site/js/steward-handoff-code-core.mjs";
import { handleGetStewardHandoff } from "../worker/src/resolver/steward-handoff";

/**
 * Steward scan handoff fallbacks — S1 clipboard path, S5 Safari steward param, S6 /v/ interstitial.
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S1 · S5 · S6
 * @see docs/DEVICE_OS_QA.md P1-PWA-V steps 4–7
 */

const PAGES_ORIGIN = "http://127.0.0.1:8788";
const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";
const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

const IPHONE_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const SCAN_FIXTURE_HTML = readFileSync(
  join(process.cwd(), "site/e2e-fixtures/scan-active.html"),
  "utf8"
);

const WALLET_ENTRY = {
  id: "e2e_steward_handoff_fallback",
  label: "E2E Handoff Fallback",
  saved_at: "2026-05-30T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  handle: "handofffallback",
  manifesto_line: "Handoff fallback test",
  scan_url: `${PAGES_ORIGIN}/c/${PROFILE_ID}?q=${QR_ID}`,
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

function withStandaloneDisplayModeScript() {
  return `
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === "(display-mode: standalone)") {
        return {
          matches: true,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        };
      }
      return originalMatchMedia(query);
    };
  `;
}

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

async function stubScanRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: "1.0",
        resolver: { operator: "humanity.llc", version: "1.0" },
        scan: {
          kind: "active",
          profile_id: PROFILE_ID,
          qr_id: QR_ID,
          card: { status: "active", handle: "river_example", manifesto_line: "Open studio" },
          verification: { state: "registered", label: "Registered" },
          human_trust: { label: "Registered", subtitle: "", pill_active: false },
        },
      }),
    })
  );
  await page.route(`**/c/${PROFILE_ID}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: SCAN_FIXTURE_HTML,
    })
  );
}

async function installStewardHandoffRoutes(page: Page) {
  const code = encodeStewardHandoffCode(PROFILE_ID, QR_ID)!;
  await page.route(`**/v/${code}**`, async (route) => {
    const reqUrl = route.request().url();
    const request = new Request(reqUrl.replace(PAGES_ORIGIN, `${PAGES_ORIGIN}`));
    const res = await handleGetStewardHandoff(request, code);
    if (res.status === 302) {
      const location = res.headers.get("Location") ?? "";
      const redirected = location.includes("hc_steward=1")
        ? `${PAGES_ORIGIN}${SCAN_FIXTURE}?hc_steward=1`
        : `${PAGES_ORIGIN}${SCAN_FIXTURE}`;
      await route.fulfill({
        status: 302,
        headers: { Location: redirected },
      });
      return;
    }
    await route.fulfill({
      status: res.status,
      contentType: "text/html; charset=utf-8",
      body: await res.text(),
    });
  });
  return code;
}

async function gotoScanFixture(page: Page, query = "") {
  await stubScanRoutes(page);
  await page.goto(`${SCAN_FIXTURE}${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible({
    timeout: 15_000,
  });
}

async function waitForHandoffExplainer(page: Page) {
  await expect(page.locator("#vouch-explainer")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#vouch-explainer-actions")).toBeVisible();
  await expect(page.locator(".vouch-copy-scan-link")).toBeVisible();
}

async function seedSavedWallet(page: Page, standalone = false) {
  if (standalone) {
    await page.addInitScript(withStandaloneDisplayModeScript());
  }
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
  }, WALLET_ENTRY);
}

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function refreshHubScanSurfaces(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-device-hub-changed"));
    window.dispatchEvent(new Event("hc-device-os-refreshed"));
  });
}

async function openHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 15_000 });
}

test.describe("steward scan handoff Safari fallbacks (S1 / S5)", () => {
  test.use({ userAgent: IPHONE_SAFARI_UA });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_wallet");
      sessionStorage.removeItem("hc_created");
    });
  });

  test("iOS Safari camera handoff copy when wallet is empty (S1 · P1-PWA-V step 4)", async ({
    page,
  }) => {
    await gotoScanFixture(page);
    await waitForHandoffExplainer(page);
    await expect(page.locator("#vouch-explainer-copy")).toContainText(/Home Screen app/i);
    await expect(page.locator("#vouch-explainer-copy")).toContainText(
      /cannot attest from Safari alone/i
    );
  });

  test("hc_steward=1 shows steward handoff first and defers actor band (S5 · step 6)", async ({
    page,
  }) => {
    await gotoScanFixture(page, "?hc_steward=1");
    await waitForHandoffExplainer(page);
    await expect(page.locator("#vouch-explainer-copy")).toContainText(
      /stewards who vouch from a Home Screen app/i
    );
    await expect(page.locator("body")).toHaveAttribute("data-steward-scan-handoff", "1");
    await expect(page.locator("#scan-actor-band")).toBeHidden();
  });

  test("Copy scan link keeps hc_steward=1 on steward landing (S5)", async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoScanFixture(page, "?hc_steward=1&q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5");
    await waitForHandoffExplainer(page);
    await page.locator(".vouch-copy-scan-link").click();
    await expect(page.locator(".vouch-copy-scan-link")).toHaveText(/Link copied/i, {
      timeout: 5000,
    });
    const copied = await page.evaluate(async () => navigator.clipboard.readText());
    expect(copied).toContain("hc_steward=1");
    expect(copied).toContain(PROFILE_ID);
  });
});

test.describe("steward handoff short URL interstitial (S6 · P1-PWA-V step 7)", () => {
  test.use({ userAgent: IPHONE_SAFARI_UA });

  test("Continue reaches scan page with steward handoff copy", async ({ page }) => {
    await stubScanRoutes(page);
    const code = await installStewardHandoffRoutes(page);
    await page.goto(`${PAGES_ORIGIN}/v/${code}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Open this scan in your Home Screen app" })).toBeVisible();
    await expect(page.locator("#steward-handoff-scan-url")).toContainText(PROFILE_ID);
    await expect(page.locator("#steward-handoff-scan-url")).toContainText("hc_steward=1");

    await page.getByRole("link", { name: "Continue to scan page" }).click();
    await page.waitForURL(/hc_steward=1/, { timeout: 15_000 });
    await waitForHandoffExplainer(page);
    await expect(page.locator("#vouch-explainer-copy")).toContainText(/Home Screen app/i);
  });
});

test.describe("hub Open scan link paste handoff (S1 · P1-PWA-V step 5)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));
    await page.route(`**/c/${PROFILE_ID}*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: SCAN_FIXTURE_HTML,
      })
    );
  });

  test("standalone hub paste opens scan in same tab", async ({ page }) => {
    await seedSavedWallet(page, true);
    await page.goto("/");
    await waitForStatusDotReady(page);
    await openHub(page);
    await refreshHubScanSurfaces(page);

    await page.locator('summary:has-text("Open scan link")').click();
    await page.fill("#hub-open-scan-url", `${PAGES_ORIGIN}/c/${PROFILE_ID}?q=${QR_ID}`);
    await page.locator("#hub-open-scan-form button[type=submit]").click();

    await page.waitForURL(`**/c/${PROFILE_ID}*`, { timeout: 15_000 });
    await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
  });
});

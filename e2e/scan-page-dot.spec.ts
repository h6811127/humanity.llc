import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * Scan page progressive device dot + glance (Phase 8.5 E2E).
 * @see docs/SCAN_PAGE_DEVICE_DOT.md
 * @see docs/DEVICE_OS_QA.md § P1-SD
 *
 * Static fixture on Pages :8788 (no Worker DB). Regenerate:
 * `npm run site:generate-scan-e2e-fixture`
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";

const SHOWCASE_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const SHOWCASE_QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

const STEWARD_WALLET_ENTRY = {
  id: "e2e_scan_steward",
  label: "E2E Scan Steward",
  saved_at: "2026-05-26T12:00:00.000Z",
  profile_id: SHOWCASE_PROFILE,
  qr_id: SHOWCASE_QR,
  handle: "river_example",
  manifesto_line: "Open studio",
  scan_url: `http://127.0.0.1:8788/c/${SHOWCASE_PROFILE}?q=${SHOWCASE_QR}`,
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  verification: { state: "steward", label: "Steward" },
};

const OTHER_TAB_SESSION = {
  profile_id: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
  qr_id: "qr_E2eOtherTabTest1",
  handle: "othertab",
  wallet_label: "Other Tab Card",
  manifesto_line: "Other tab line",
  scan_url:
    "http://127.0.0.1:8787/c/8Ym8nQ3pR5sU7wX9zA2bC4dE6?q=qr_E2eOtherTabTest1",
  owner_public_key_b58: "pubkeyothertabtestxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyothertabtestxxxxxxxxxx",
};

const TAB_B_ID = "e2e-scan-dot-cross-tab-b";

function mockHealth(route: Route, status: "ok" | "degraded" = "ok") {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status, database: "ok" }),
  });
}

function mockNoLiveProof(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    return route.continue();
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function wireScanRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoLiveProof);
}

async function gotoScanFixture(page: Page) {
  await wireScanRoutes(page);
  await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible();
}

async function stabilizeCrossTabChrome(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  });
}

test.describe("scan page device dot", () => {
  test("privacy gate: tab keys without ever saving wallet stay static", async ({ page }) => {
    await page.addInitScript((session) => {
      localStorage.removeItem("hc_wallet");
      localStorage.removeItem("hc_scan_operator_familiar");
      sessionStorage.setItem("hc_created", JSON.stringify(session));
    }, {
      profile_id: SHOWCASE_PROFILE,
      qr_id: SHOWCASE_QR,
      handle: "river_example",
      owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
      owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
    });

    await gotoScanFixture(page);

    const btn = page.locator("#scan-page-dot-btn");
    await expect(btn).not.toHaveClass(/scan-page-dot--dynamic/);
    await expect(page.locator("#scan-page-dot")).not.toHaveAttribute(
      "data-dot-state",
      /.+/
    );
  });

  test("stranger sees static home dot without dynamic state", async ({ page }) => {
    await gotoScanFixture(page);

    const btn = page.locator("#scan-page-dot-btn");
    const dot = page.locator("#scan-page-dot");

    await expect(btn).not.toHaveClass(/scan-page-dot--dynamic/);
    await expect(btn).toHaveAttribute("aria-label", "humanity.llc home");
    await expect(dot).toHaveAttribute("aria-hidden", "true");
    await expect(dot).not.toHaveAttribute("data-dot-state", /.+/);

    await btn.click();
    await expect(page.locator("#scan-page-dot-glance")).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/scan-page-dot-glance-open/);
  });

  test("hero card has wordmark only (no in-card brand dot)", async ({ page }) => {
    await gotoScanFixture(page);

    const host = page.locator(".scan-hero-host.scan-hero-wordmark");
    await expect(host).toHaveCount(1);
    await expect(host).toContainText("humanity.llc");
    await expect(host.locator(".pass-dot")).toHaveCount(0);
  });

  test("steward wallet enables dynamic dot and scan glance", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, STEWARD_WALLET_ENTRY);

    await gotoScanFixture(page);

    const btn = page.locator("#scan-page-dot-btn");
    const dot = page.locator("#scan-page-dot");

    await expect(btn).toHaveClass(/scan-page-dot--dynamic/, { timeout: 15_000 });
    await expect(dot).toHaveAttribute("data-dot-state", "ok:steward");
    await expect(dot).toHaveClass(/pass-dot-status-device-steward/);
    await expect(btn).toHaveAttribute("aria-label", /your device/i);

    await btn.click();
    const glance = page.locator("#scan-page-dot-glance");
    await expect(glance).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/scan-page-dot-glance-open/);
    await expect(glance.locator(".scan-page-dot-glance-eyebrow")).toContainText("Your device");
    await expect(glance.locator(".scan-page-dot-glance-now")).not.toBeEmpty();
    await expect(page.locator("#device-hub")).toHaveCount(0);
  });

  test("escape closes scan glance", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, STEWARD_WALLET_ENTRY);

    await gotoScanFixture(page);

    const btn = page.locator("#scan-page-dot-btn");
    await expect(btn).toHaveClass(/scan-page-dot--dynamic/, { timeout: 15_000 });

    await btn.click();
    await expect(page.locator("#scan-page-dot-glance")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#scan-page-dot-glance")).toBeHidden();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("scan page device dot cross-tab", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  async function openScanObserver(context: BrowserContext) {
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.removeItem("hc_wallet");
      localStorage.removeItem("hc_created");
      localStorage.setItem("hc_scan_operator_familiar", "1");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    });
    await gotoScanFixture(page);
    return page;
  }

  async function openKeysTab(context: BrowserContext) {
    const page = await context.newPage();
    await page.addInitScript(({ tabId, session }) => {
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
      sessionStorage.setItem("hc_tab_id", tabId);
      sessionStorage.setItem("hc_created", JSON.stringify(session));
    }, { tabId: TAB_B_ID, session: OTHER_TAB_SESSION });
    await wireScanRoutes(page);
    await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });
    return page;
  }

  test("dot overlay matches cross-tab banner when keys are in another tab", async ({
    context,
  }) => {
    const pageA = await openScanObserver(context);
    const pageB = await openKeysTab(context);

    await expect
      .poll(async () =>
        pageA.evaluate((id) => {
          const raw = localStorage.getItem("hc_tab_keys_presence");
          const map = raw ? JSON.parse(raw) : {};
          return map[id]?.profile_id ?? null;
        }, TAB_B_ID)
      )
      .toBe(OTHER_TAB_SESSION.profile_id);

    await stabilizeCrossTabChrome(pageA);

    const banner = pageA.locator("#scan-cross-tab-banner");
    await expect(banner).toBeVisible({ timeout: 20_000 });

    const dot = pageA.locator("#scan-page-dot");
    await expect(dot).toHaveAttribute("data-dot-overlay", "cross_tab_keys");
    await expect(dot).toHaveClass(/pass-dot-overlay-cross_tab_keys/);

    await pageB.close();
    await stabilizeCrossTabChrome(pageA);
    await expect(banner).toBeHidden({ timeout: 20_000 });
    await pageA.close();
  });
});

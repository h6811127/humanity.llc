import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Hub in-app QR scanner (S3) — dialog open, chrome entry, mocked decode → same-tab scan.
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S3
 * @see docs/DEVICE_OS_QA.md P1-PWA-V
 * @see docs/HUB_SCAN_QR_PLACEMENT.md
 */

const PAGES_ORIGIN = "http://127.0.0.1:8788";
const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_E2eKeyLossSadPath1";
const SCAN_QR_URL = `${PAGES_ORIGIN}/c/${PROFILE_ID}?q=${QR_ID}`;

const VOUCHEE_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCHEE_QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCHER_PROFILE = "8Ym8nQ3pR5sU7wX9zA2bC4dE6";
const VOUCHER_QR = "qr_E2eHubScannerVouch1";
const VOUCH_SCAN_URL = `${PAGES_ORIGIN}/c/${VOUCHEE_PROFILE}?q=${VOUCHEE_QR}`;

const WALLET_ENTRY = {
  id: "e2e_hub_qr_scanner",
  label: "E2E Hub Scanner",
  saved_at: "2026-05-30T12:00:00.000Z",
  profile_id: PROFILE_ID,
  qr_id: QR_ID,
  handle: "hubscanner",
  manifesto_line: "Hub scanner test",
  scan_url: SCAN_QR_URL,
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

const STEWARD_VOUCHER_ENTRY = {
  id: "e2e_hub_scanner_voucher",
  label: "E2E Hub scan vouch",
  saved_at: "2026-05-30T12:00:00.000Z",
  profile_id: VOUCHER_PROFILE,
  qr_id: VOUCHER_QR,
  handle: "hub_voucher",
  manifesto_line: "Hub scanner vouch test",
  scan_url: `${PAGES_ORIGIN}/c/${VOUCHER_PROFILE}?q=${VOUCHER_QR}`,
  owner_public_key_b58: "pubkeyhubscannervouchtestxxxxxx",
  owner_private_key_b58: "privkeyhubscannervouchtestxxxxx",
  verification: { state: "steward", label: "Steward" },
};

const SCAN_FIXTURE_HTML = readFileSync(
  join(process.cwd(), "site/e2e-fixtures/scan-active.html"),
  "utf8"
);

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

function withMockScanBackendScript(scanUrl: string) {
  return `
    class MockBarcodeDetector {
      async detect() {
        return [{ rawValue: ${JSON.stringify(scanUrl)} }];
      }
    }
    globalThis.BarcodeDetector = MockBarcodeDetector;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.fillRect(0, 0, 640, 480);
      return canvas.captureStream(15);
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

function cardStatusBody(
  profileId: string,
  qrId: string,
  verification: { state: string; label: string }
) {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: profileId,
      qr_id: qrId,
      card: { status: "active", handle: "e2e_vouch" },
      verification: { state: verification.state, label: verification.label },
      human_trust: { label: verification.label, subtitle: "", pill_active: false },
    },
  };
}

async function stubHubRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));
  await page.route(`**/c/${PROFILE_ID}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: SCAN_FIXTURE_HTML,
    })
  );
}

async function stubVouchScanRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
  await page.route("**/.well-known/hc/v1/cards/**", async (route: Route) => {
    const url = route.request().url();
    if (!url.includes("/status")) {
      await route.continue();
      return;
    }
    if (url.includes(VOUCHEE_PROFILE)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          cardStatusBody(VOUCHEE_PROFILE, VOUCHEE_QR, {
            state: "registered",
            label: "Registered",
          })
        ),
      });
      return;
    }
    if (url.includes(VOUCHER_PROFILE)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          cardStatusBody(VOUCHER_PROFILE, VOUCHER_QR, {
            state: "steward",
            label: "Steward",
          })
        ),
      });
      return;
    }
    await route.continue();
  });
  await page.route(`**/c/${VOUCHEE_PROFILE}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: SCAN_FIXTURE_HTML,
    })
  );
}

async function seedSavedWallet(page: Page, standalone = false, entry = WALLET_ENTRY) {
  if (standalone) {
    await page.addInitScript(withStandaloneDisplayModeScript());
  }
  await page.addInitScript((walletEntry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
  }, entry);
}

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function openHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 15_000 });
}

async function refreshHubScanSurfaces(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-device-hub-changed"));
    window.dispatchEvent(new Event("hc-device-os-refreshed"));
  });
}

async function waitForHubScanButton(page: Page) {
  await refreshHubScanSurfaces(page);
  await expect(page.locator("#hub-scan-qr-btn")).toBeVisible({ timeout: 15_000 });
}

async function waitForChromeScanButton(page: Page) {
  await refreshHubScanSurfaces(page);
  await expect(page.locator("#shell-scan-qr-btn")).toBeVisible({ timeout: 15_000 });
}

test.describe("hub in-app QR scanner (S3)", () => {
  test.use({ permissions: ["camera"] });

  test.beforeEach(async ({ page }) => {
    await stubHubRoutes(page);
  });

  test("Scan QR to vouch opens scanner dialog with expected copy", async ({ page }) => {
    await seedSavedWallet(page);
    await page.goto("/");
    await waitForStatusDotReady(page);
    await openHub(page);
    await waitForHubScanButton(page);

    const scanBtn = page.locator("#hub-scan-qr-btn");
    await expect(scanBtn).toHaveText("Scan QR to vouch");
    await expect(page.locator("#device-hub-steward-tools")).toBeVisible();

    await scanBtn.click();

    const dialog = page.locator("#device-hub-qr-scanner");
    await expect(dialog).toHaveAttribute("open", "");
    await expect(page.locator("#device-hub-qr-scanner-title")).toHaveText("Scan a Humanity QR");
    await expect(page.locator("#device-hub-qr-scanner-lead")).toContainText(
      /opens in this app/i
    );

    await page.locator("[data-hub-qr-scanner-close]").click();
    await expect(dialog).not.toHaveAttribute("open", "");
  });

  test("standalone chrome scan icon opens the same scanner dialog", async ({ page }) => {
    await seedSavedWallet(page, true);
    await page.goto("/");
    await waitForStatusDotReady(page);
    await waitForChromeScanButton(page);

    const chromeBtn = page.locator("#shell-scan-qr-btn");
    await chromeBtn.click();

    const dialog = page.locator("#device-hub-qr-scanner");
    await expect(dialog).toHaveAttribute("open", "");
    await expect(page.locator("#device-hub-qr-scanner-title")).toHaveText("Scan a Humanity QR");
  });

  test("mocked BarcodeDetector decode navigates same-tab to scan URL", async ({ page }) => {
    await page.addInitScript(withMockScanBackendScript(SCAN_QR_URL));
    await seedSavedWallet(page);
    await page.goto("/");
    await waitForStatusDotReady(page);
    await openHub(page);
    await waitForHubScanButton(page);

    await page.locator("#hub-scan-qr-btn").click();
    await expect(page.locator("#device-hub-qr-scanner")).toHaveAttribute("open", "");

    await page.waitForURL(`**/c/${PROFILE_ID}*`, { timeout: 15_000 });
    expect(page.url()).toContain(`/c/${PROFILE_ID}`);
    expect(page.url()).toContain(`q=${QR_ID}`);
    await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
  });

  test("mocked in-app scan loads vouch UI when steward keys are present (P1-PWA-V steps 2–3)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("hc_default_vouch_profile_id");
      localStorage.removeItem("hc_vouch_auto_activate");
      sessionStorage.clear();
    });
    await stubVouchScanRoutes(page);
    await page.addInitScript(withMockScanBackendScript(VOUCH_SCAN_URL));
    await seedSavedWallet(page, true, STEWARD_VOUCHER_ENTRY);
    await page.goto("/");
    await waitForStatusDotReady(page);
    await openHub(page);
    await waitForHubScanButton(page);

    await page.locator("#hub-scan-qr-btn").click();
    await page.waitForURL(`**/c/${VOUCHEE_PROFILE}*`, { timeout: 15_000 });

    await expect(page.locator("#vouch-interactive")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#vouch-row")).toBeVisible();
    await expect(page.locator("#vouch-explainer")).toHaveAttribute("hidden", "");
    await expect(page.locator("#vouch-explainer-copy")).not.toContainText(/Home Screen app/i);
  });

  test("hides scan surfaces when wallet is empty", async ({ page }) => {
    await page.goto("/");
    await waitForStatusDotReady(page);
    await openHub(page);

    await expect(page.locator("#hub-scan-qr-btn")).toBeHidden();
    await expect(page.locator("#device-hub-steward-tools")).toBeHidden();
    await expect(page.locator("#shell-scan-qr-btn")).toBeHidden();
  });
});

import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * PWA install Phase 3 — shell install card gating in CI.
 * @see docs/PWA_INSTALL_IMPLEMENTATION.md Phase 3
 * @see docs/DEVICE_OS_QA.md P1-PWA
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";
const PWA_DISMISS_KEY = "hc_pwa_install_dismissed_at";

const WALLET_ENTRY = {
  id: "e2e_pwa_install_wallet",
  label: "E2E PWA Install Card",
  saved_at: "2026-05-27T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2ePwaInstallTest",
  handle: "e2epwainstall",
  manifesto_line: "PWA install test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2ePwaInstallTest",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

async function mockHealth(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

async function mockNoLiveProof(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    await route.continue();
    return;
  }
  await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function wireShellRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoLiveProof);
}

async function seedPwaLandingStorage(page: Page) {
  await page.addInitScript(({ entry, dismissKey }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.removeItem(dismissKey);
    localStorage.setItem("hc_watch_live_proof", "0");
  }, { entry: WALLET_ENTRY, dismissKey: PWA_DISMISS_KEY });
}

async function waitForShellReady(page: Page) {
  await page.waitForFunction(() => {
    const chrome = document.getElementById("top-chrome");
    const dot = document.getElementById("brand-status-dot-btn");
    return (
      chrome instanceof HTMLElement &&
      !chrome.dataset.deviceStatusError &&
      dot instanceof HTMLButtonElement
    );
  }, { timeout: 20_000 });
}

async function dispatchBeforeInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "preventDefault", { value: () => {} });
    Object.defineProperty(event, "prompt", {
      value: async () => ({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
}

async function waitForInstallCardVisible(page: Page) {
  await expect
    .poll(
      async () => {
        await dispatchBeforeInstallPrompt(page);
        const card = page.locator("#device-pwa-install-card");
        if (!(await card.count())) return false;
        return card.isVisible();
      },
      { timeout: 20_000 }
    )
    .toBe(true);
  await expect(page.locator("#device-pwa-install-card")).toContainText(
    /Install on this device/i
  );
}

test.describe("device PWA install (phase 3)", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("landing shows install card when beforeinstallprompt is available", async ({ page }) => {
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await waitForInstallCardVisible(page);
    await expect(page.locator("[data-pwa-install-confirm]")).toBeVisible();
  });

  test("scan fixture has no install card placeholder", async ({ page }) => {
    await wireShellRoutes(page);
    await page.goto(SCAN_FIXTURE, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scan-safety-header[data-profile-id]")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#device-pwa-install-card")).toHaveCount(0);
  });

  test("dismiss snoozes install card and writes localStorage", async ({ page }) => {
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await waitForInstallCardVisible(page);

    await page.locator("[data-pwa-install-dismiss]").click();
    await expect(page.locator("#device-pwa-install-card")).toBeHidden();

    const dismissedAt = await page.evaluate(
      (key) => localStorage.getItem(key),
      PWA_DISMISS_KEY
    );
    expect(dismissedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await dispatchBeforeInstallPrompt(page);
    await expect(page.locator("#device-pwa-install-card")).toBeHidden();
  });
});

import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * PWA install — shell install card gating in CI (Phases 3–4).
 * @see docs/PWA_INSTALL_IMPLEMENTATION.md Phases 3–4
 * @see docs/DEVICE_OS_QA.md P1-PWA
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";
const PWA_DISMISS_KEY = "hc_pwa_install_dismissed_at";
const TAB_B_ID = "e2e-pwa-install-tab-b";

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

/** Keys held in another tab — triggers cross_tab_keys inbox on observer. */
const OTHER_TAB_SESSION = {
  profile_id: "8Ym8nQ3pR5sU7wX9zA2bC4dE6",
  qr_id: "qr_E2ePwaOtherTabTest",
  handle: "pwaothertab",
  wallet_label: "PWA Other Tab Card",
  manifesto_line: "Other tab line",
  scan_url:
    "http://127.0.0.1:8787/c/8Ym8nQ3pR5sU7wX9zA2bC4dE6?q=qr_E2ePwaOtherTabTest",
  owner_public_key_b58: "pubkeyothertabtestxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyothertabtestxxxxxxxxxx",
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

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

function withStandaloneDisplayMode() {
  return {
    content: `
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
    `,
  };
}

function withIosSafariUserAgent() {
  return {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  };
}

async function openKeysTab(context: BrowserContext, tabId: string) {
  const page = await context.newPage();
  await page.addInitScript(({ id, session }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    sessionStorage.setItem("hc_tab_id", id);
    sessionStorage.setItem("hc_created", JSON.stringify(session));
  }, { id: tabId, session: OTHER_TAB_SESSION });
  await wireShellRoutes(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  return page;
}

async function waitForCrossTabInbox(page: Page) {
  await expect
    .poll(async () => page.locator("#shell-notif-badge").getAttribute("data-inbox-chroma"), {
      timeout: 20_000,
    })
    .toBe("cross_tab_keys");
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

test.describe("device PWA install (phase 4 rollout gate)", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("create flow has no install card placeholder (P1-PWA step 2)", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await wireShellRoutes(page);
    await page.goto("/create/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await dispatchBeforeInstallPrompt(page);
    await expect(page.locator("#device-pwa-install-card")).toHaveCount(0);
  });

  test("install card hidden with zero saved cards", async ({ page }) => {
    await page.addInitScript(({ dismissKey }) => {
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
      localStorage.removeItem("hc_wallet");
      localStorage.removeItem(dismissKey);
    }, { dismissKey: PWA_DISMISS_KEY });
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await dispatchBeforeInstallPrompt(page);
    await expect(page.locator("#device-pwa-install-card")).toBeHidden();
  });

  test("install card hidden while cross_tab_keys inbox is active (P1-PWA step 8)", async ({
    context,
  }) => {
    const pageA = await context.newPage();
    await seedPwaLandingStorage(pageA);
    await wireShellRoutes(pageA);
    await pageA.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(pageA);

    const pageB = await openKeysTab(context, TAB_B_ID);
    await waitForCrossTabInbox(pageA);
    await dispatchBeforeInstallPrompt(pageA);
    await expect(pageA.locator("#device-pwa-install-card")).toBeHidden();

    await pageB.close();
    await pageA.close();
  });

  test("wallet shows iOS manual copy without Install button (P1-PWA step 9)", async ({
    browser,
  }) => {
    const context = await browser.newContext(withIosSafariUserAgent());
    const page = await context.newPage();
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/wallet/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);

    await expect
      .poll(async () => page.locator("#device-pwa-install-card").isVisible(), {
        timeout: 20_000,
      })
      .toBe(true);
    await expect(page.locator("#device-pwa-install-card")).toContainText(/Add to Home Screen/i);
    await expect(page.locator("#device-pwa-install-card")).toContainText(/Share/i);
    await expect(page.locator("[data-pwa-install-confirm]")).toHaveCount(0);

    await context.close();
  });

  test("standalone mode hides install card and hub dot still opens (P1-PWA step 10)", async ({
    page,
  }) => {
    await page.addInitScript(withStandaloneDisplayMode().content);
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await dispatchBeforeInstallPrompt(page);
    await expect(page.locator("#device-pwa-install-card")).toBeHidden();

    await expect(page.locator("body")).not.toHaveClass(/device-hub-sheet-open/);
    await waitForStatusDotReady(page);
    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
  });

  test("install card hidden when status graph failed to load (P1-PWA step 11)", async ({
    page,
  }) => {
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await dispatchBeforeInstallPrompt(page);
    await waitForInstallCardVisible(page);

    await page.evaluate(() => {
      const chrome = document.getElementById("top-chrome");
      if (chrome) chrome.dataset.deviceStatusError = "1";
      document.dispatchEvent(new CustomEvent("hc-device-os-refreshed"));
    });
    await expect(page.locator("#device-pwa-install-card")).toBeHidden();
  });

  test("PWA module does not register a service worker (v1 policy)", async ({ page }) => {
    await seedPwaLandingStorage(page);
    await wireShellRoutes(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);

    const registration = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const reg = await navigator.serviceWorker.getRegistration("/");
      return reg?.active?.scriptURL ?? null;
    });
    expect(registration).toBeNull();
  });
});

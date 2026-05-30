import { test, expect, type Page } from "@playwright/test";

/**
 * PWA standalone scan preview handoff (P1-PWA-N).
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md § Recommended path step 2
 * @see docs/DEVICE_OS_QA.md P1-PWA-N
 */

const SCAN_FIXTURE = "/e2e-fixtures/scan-active.html";
const PAGES_ORIGIN = "http://127.0.0.1:8788";

const HANDOFF_ENTRY = {
  id: "e2e_pwa_scan_handoff",
  label: "PWA Scan Handoff",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2ePwaScanHandoff",
  handle: "pwascanhandoff",
  manifesto_line: "Scan handoff test line",
  scan_url: `${PAGES_ORIGIN}${SCAN_FIXTURE}`,
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
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

async function stubCreatedResolver(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
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
          profile_id: HANDOFF_ENTRY.profile_id,
          qr_id: HANDOFF_ENTRY.qr_id,
          card: {
            status: "active",
            handle: HANDOFF_ENTRY.handle,
            manifesto_line: HANDOFF_ENTRY.manifesto_line,
          },
          verification: { state: "registered", label: "Registered" },
          human_trust: { label: "Registered", subtitle: "", pill_active: false },
        },
      }),
    })
  );
  await page.route(`**/.well-known/hc/v1/cards/${HANDOFF_ENTRY.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: HANDOFF_ENTRY.handle,
        manifesto_line: HANDOFF_ENTRY.manifesto_line,
        created_at: "2026-05-29T12:00:00.000Z",
        status: "active",
      }),
    })
  );
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function seedCreatedSetupTestStep(page: Page, standalone: boolean) {
  if (standalone) {
    await page.addInitScript(withStandaloneDisplayModeScript());
  }
  await page.addInitScript((entry) => {
    localStorage.removeItem("hc_setup_done");
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: entry.profile_id,
        qr_id: entry.qr_id,
        owner_private_key_b58: entry.owner_private_key_b58,
        owner_public_key_b58: entry.owner_public_key_b58,
        handle: entry.handle,
        manifesto_line: entry.manifesto_line,
        scan_url: entry.scan_url,
      })
    );
  }, HANDOFF_ENTRY);
}

async function seedShellHandoffWallet(page: Page, standalone: boolean) {
  if (standalone) {
    await page.addInitScript(withStandaloneDisplayModeScript());
  }
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem(
      "hc_setup_done",
      JSON.stringify({ [entry.profile_id]: true })
    );
    localStorage.setItem("hc_watch_live_proof", "0");
  }, HANDOFF_ENTRY);
}

async function seedWalletPin(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem(
      "hc_device_pins",
      JSON.stringify([
        {
          id: "pin_e2e_pwa_handoff",
          label: "E2E PWA pin",
          profile_id: entry.profile_id,
          qr_id: entry.qr_id,
          scan_url: entry.scan_url,
          pinned_at: "2026-05-29T12:00:00.000Z",
        },
      ])
    );
  }, HANDOFF_ENTRY);
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

async function openHubSheet(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
  await expect(page.locator(".hub-open-scan").first()).toBeVisible({ timeout: 15_000 });
}

function createdSetupTestUrl() {
  const params = new URLSearchParams({
    profile_id: HANDOFF_ENTRY.profile_id,
    qr_id: HANDOFF_ENTRY.qr_id,
    fresh: "1",
  });
  return `/created/?${params.toString()}#setup-test`;
}

test.describe("device PWA scan handoff (P1-PWA-N)", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("standalone test scan opens same tab with return banner", async ({ page }) => {
    await seedCreatedSetupTestStep(page, true);
    await stubCreatedResolver(page);
    await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-setup-action="test-scan"]').click();

    await expect(page).toHaveURL(/scan-active/, { timeout: 10_000 });
    await expect(page).toHaveURL(/hc_return=/);
    await expect(page.locator("#scan-steward-preview-return")).toBeVisible();
    await expect(page.locator("#scan-steward-preview-return-link")).toContainText(
      /Back to setup/i
    );

    await page.locator("#scan-steward-preview-return-link").click();
    await expect(page).toHaveURL(/\/created\//);
    await expect(page.locator("#created-setup-root")).toBeVisible();
  });

  test("standalone test scan returns via history back (P1-PWA-N step 3)", async ({ page }) => {
    await seedCreatedSetupTestStep(page, true);
    await stubCreatedResolver(page);
    await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
    await page.locator('[data-setup-action="test-scan"]').click();

    await expect(page).toHaveURL(/scan-active/, { timeout: 10_000 });
    await page.goBack();
    await expect(page).toHaveURL(/\/created\//);
    await expect(page).toHaveURL(/#setup-test/);
    await expect(page.locator("#created-setup-panel-test")).toBeVisible();
    await expect(page.locator("#created-setup-panel-done")).toBeHidden();
  });

  test("browser tab test scan opens new window (regression)", async ({ page, context }) => {
    await seedCreatedSetupTestStep(page, false);
    await stubCreatedResolver(page);
    await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });

    const popupPromise = context.waitForEvent("page");
    await page.locator('[data-setup-action="test-scan"]').click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/scan-active/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/created\//);
    await expect(page).toHaveURL(/#setup-test/);
    await popup.close();
  });

  test("browser Continue on test scan advances without opening scan (P1b / S31)", async ({ page }) => {
    await seedCreatedSetupTestStep(page, false);
    await stubCreatedResolver(page);
    await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
    await page.locator("#created-setup-continue").click();

    await expect(page).toHaveURL(/#setup-protect/);
    await expect(page.locator("#created-setup-panel-protect")).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/scan-active/);
  });

  test("standalone Continue on test scan advances without opening scan (P1b)", async ({ page }) => {
    await seedCreatedSetupTestStep(page, true);
    await stubCreatedResolver(page);
    await page.goto(createdSetupTestUrl(), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#created-setup-panel-test")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".created-setup-test-hint")).toContainText(/Continue/i);
    await page.locator("#created-setup-continue").click();

    await expect(page).toHaveURL(/#setup-protect/);
    await expect(page.locator("#created-setup-panel-protect")).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/scan-active/);
  });

  test("standalone hub Open scan stays in same tab (P1-PWA-N step 4)", async ({ page }) => {
    await seedShellHandoffWallet(page, true);
    await stubCreatedResolver(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await openHubSheet(page);

    await page.locator(".hub-open-scan").first().click();
    await expect(page).toHaveURL(/scan-active/, { timeout: 10_000 });
    await expect(page).toHaveURL(/hc_return=/);
  });

  test("standalone wallet pin opens scan in same tab (P1-PWA-N step 6)", async ({ page }) => {
    await seedShellHandoffWallet(page, true);
    await seedWalletPin(page);
    await stubCreatedResolver(page);
    await page.goto("/wallet/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);

    await expect(page.getByRole("link", { name: /E2E PWA pin/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const pinLink = page.getByRole("link", { name: /E2E PWA pin/i }).first();
    await expect(pinLink).not.toContainText(/new tab/i);
    await pinLink.click();
    await expect(page).toHaveURL(/scan-active/, { timeout: 10_000 });
    await expect(page).toHaveURL(/hc_return=/);
  });

  test("browser hub Open scan opens new window (regression)", async ({ page, context }) => {
    await seedShellHandoffWallet(page, false);
    await stubCreatedResolver(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await openHubSheet(page);

    const popupPromise = context.waitForEvent("page");
    await page.locator(".hub-open-scan").first().click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/scan-active/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/scan-active/);
    await popup.close();
  });

  test("standalone hub Open scan link form navigates pasted scan URL (camera handoff)", async ({
    page,
  }) => {
    await seedShellHandoffWallet(page, true);
    await stubCreatedResolver(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await openHubSheet(page);

    const scanUrl = `${PAGES_ORIGIN}/c/${HANDOFF_ENTRY.profile_id}?q=${HANDOFF_ENTRY.qr_id}`;
    await page.locator('summary:has-text("Open scan link")').click();
    await page.fill("#hub-open-scan-url", scanUrl);
    await page.locator("#hub-open-scan-form button[type=submit]").click();
    await expect(page).toHaveURL(
      new RegExp(`/c/${HANDOFF_ENTRY.profile_id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      { timeout: 10_000 }
    );
  });
});

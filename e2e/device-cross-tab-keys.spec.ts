import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * Phase 6 cross-tab keys E2E - two browser tabs, shared localStorage presence.
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md
 */

const WALLET_ENTRY = {
  id: "e2e_crosstab_wallet",
  label: "E2E Test Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

/** Unsaved on device - generic cross-tab lane. */
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

const TAB_B_ID = "e2e-cross-tab-keys-tab-b";

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

function mockNoLiveProof(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    return route.continue();
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function dismissHubIntro(page: Page) {
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
}

async function wireShellRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoLiveProof);
}

/** Fingerprint-stable show needs two presence reads in the observer tab. */
async function stabilizeCrossTabChrome(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  });
  await page.waitForTimeout(450);
}

async function waitForCrossTabBadge(page: Page) {
  const badge = page.locator("#shell-notif-badge");
  await expect(badge).toBeVisible({ timeout: 20_000 });
  await expect(badge).toHaveAttribute("data-inbox-chroma", "cross_tab_keys");
  await expect(badge).toHaveAttribute("aria-label", /keys in another tab/i);
  return badge;
}

/** @typedef {"empty" | "wallet" | "orphan"} ObserverStorageMode */

/**
 * @param {BrowserContext} context
 * @param {ObserverStorageMode} [storageMode]
 */
async function openObserverLanding(context, storageMode = "empty") {
  const page = await context.newPage();
  await page.addInitScript(({ mode, walletEntry, removedId }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    if (mode === "wallet") {
      localStorage.setItem("hc_wallet", JSON.stringify([walletEntry]));
      localStorage.removeItem("hc_wallet_removed_profile_ids");
      return;
    }
    if (mode === "orphan") {
      localStorage.removeItem("hc_wallet");
      localStorage.setItem("hc_wallet_removed_profile_ids", JSON.stringify([removedId]));
      return;
    }
    localStorage.removeItem("hc_wallet");
    localStorage.removeItem("hc_wallet_removed_profile_ids");
  }, {
    mode: storageMode,
    walletEntry: WALLET_ENTRY,
    removedId: WALLET_ENTRY.profile_id,
  });
  await wireShellRoutes(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await dismissHubIntro(page);
  return page;
}

async function openKeysTab(
  context: BrowserContext,
  tabId: string,
  session: typeof OTHER_TAB_SESSION | typeof WALLET_ENTRY
) {
  const page = await context.newPage();
  await page.addInitScript(({ tabId: id, session: keys }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    sessionStorage.setItem("hc_tab_id", id);
    sessionStorage.setItem("hc_created", JSON.stringify(keys));
  }, { tabId, session });
  await wireShellRoutes(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  return page;
}

test.describe("device cross-tab keys (phase 6)", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("observer badge shows stable card label; closing keys tab clears badge", async ({
    context,
  }) => {
    const pageA = await openObserverLanding(context, "empty");
    const pageB = await openKeysTab(context, TAB_B_ID, OTHER_TAB_SESSION);

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
    await waitForCrossTabBadge(pageA);

    await pageA.locator("#shell-notif-badge").click();
    const row = pageA.locator(".device-inbox-sheet-row--cross_tab_keys");
    await expect(row).toBeVisible();
    await expect(row.getByText("Other Tab Card")).toBeVisible();
    await pageA.keyboard.press("Escape");

    await pageB.close();
    await expect(pageA.locator("#shell-notif-badge")).toBeHidden({ timeout: 10_000 });
    await pageA.close();
  });

  test("saved profile on observer tab hides generic cross-tab for that profile", async ({
    context,
  }) => {
    const pageA = await openObserverLanding(context, "wallet");
    const pageB = await openKeysTab(context, TAB_B_ID, {
      profile_id: WALLET_ENTRY.profile_id,
      qr_id: WALLET_ENTRY.qr_id,
      handle: WALLET_ENTRY.handle,
      wallet_label: WALLET_ENTRY.label,
      manifesto_line: WALLET_ENTRY.manifesto_line,
      scan_url: WALLET_ENTRY.scan_url,
      owner_public_key_b58: WALLET_ENTRY.owner_public_key_b58,
      owner_private_key_b58: WALLET_ENTRY.owner_private_key_b58,
    });

    await expect
      .poll(async () =>
        pageA.evaluate((id) => {
          const raw = localStorage.getItem("hc_tab_keys_presence");
          const map = raw ? JSON.parse(raw) : {};
          return map[id]?.profile_id ?? null;
        }, TAB_B_ID)
      )
      .toBe(WALLET_ENTRY.profile_id);

    await stabilizeCrossTabChrome(pageA);
    await expect(pageA.locator("#shell-notif-badge")).toBeHidden({ timeout: 8_000 });

    await pageB.close();
    await pageA.close();
  });

  test("removed-from-device profile uses orphan inbox copy", async ({ context }) => {
    const pageA = await openObserverLanding(context, "orphan");
    const pageB = await openKeysTab(context, TAB_B_ID, {
      profile_id: WALLET_ENTRY.profile_id,
      qr_id: WALLET_ENTRY.qr_id,
      handle: WALLET_ENTRY.handle,
      wallet_label: WALLET_ENTRY.label,
      manifesto_line: WALLET_ENTRY.manifesto_line,
      scan_url: WALLET_ENTRY.scan_url,
      owner_public_key_b58: WALLET_ENTRY.owner_public_key_b58,
      owner_private_key_b58: WALLET_ENTRY.owner_private_key_b58,
    });

    await expect
      .poll(async () =>
        pageA.evaluate((id) => {
          const raw = localStorage.getItem("hc_tab_keys_presence");
          const map = raw ? JSON.parse(raw) : {};
          return map[id]?.profile_id ?? null;
        }, TAB_B_ID)
      )
      .toBe(WALLET_ENTRY.profile_id);

    await stabilizeCrossTabChrome(pageA);
    const badge = pageA.locator("#shell-notif-badge");
    await expect(badge).toBeVisible({ timeout: 20_000 });
    await expect(badge).toHaveAttribute("aria-label", /removed card in another tab/i);

    await pageA.locator("#shell-notif-badge").click();
    const row = pageA.locator(".device-inbox-sheet-row--orphan_keys_removed");
    await expect(row).toBeVisible();
    await expect(row.getByText("Keys still open in another tab")).toBeVisible();
    await expect(row.getByText(/removed from this device/i)).toBeVisible();

    await pageB.close();
    await pageA.close();
  });
});

import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * Cross-tab live proof monitoring line — follower skips duplicate challenge GETs.
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md § Live proof “checked … ago”
 */

const WALLET_ENTRY = {
  id: "e2e_live_proof_sync_wallet",
  label: "E2E Live Proof Sync Card",
  saved_at: "2026-05-27T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eLiveProofSyncTest",
  handle: "e2eliveproofsync",
  manifesto_line: "Live proof sync test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eLiveProofSyncTest",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

function createChallengeCounter() {
  let count = 0;
  return {
    get: () => count,
    reset: () => {
      count = 0;
    },
    fulfill: async (route: Route) => {
      count += 1;
      await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    },
  };
}

async function mockHealth(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

async function mockCardStatus(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      version: "1.0",
      scan: {
        kind: "active",
        profile_id: WALLET_ENTRY.profile_id,
        qr_id: WALLET_ENTRY.qr_id,
        card: { status: "active", handle: WALLET_ENTRY.handle, manifesto_line: WALLET_ENTRY.manifesto_line },
        verification: { state: "registered", label: "Registered" },
      },
    }),
  });
}

async function wireShellRoutes(
  page: Page,
  challengeCounter: ReturnType<typeof createChallengeCounter>
) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    challengeCounter.fulfill(route)
  );
}

async function dismissHubIntro(page: Page) {
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
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

async function expandHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
    timeout: 15_000,
  });
}

async function seedWallet(page: Page, opts: { clearCheckedAt?: boolean } = {}) {
  const clearCheckedAt = opts.clearCheckedAt !== false;
  await page.addInitScript(({ entry, clearCheckedAt: clear }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_watch_live_proof", "0");
    if (clear) {
      sessionStorage.removeItem("hc_live_proof_checked_at");
      sessionStorage.removeItem("hc_hub_network_checked_at");
    }
  }, { entry: WALLET_ENTRY, clearCheckedAt });
}

async function openLandingTab(context: BrowserContext, challengeCounter: ReturnType<typeof createChallengeCounter>) {
  const page = await context.newPage();
  await seedWallet(page);
  await wireShellRoutes(page, challengeCounter);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await dismissHubIntro(page);
  return page;
}

async function leaderCheckLiveProof(page: Page, challengeCounter: ReturnType<typeof createChallengeCounter>) {
  await expandHub(page);
  await expect(page.locator("#device-hub-check-live-proof-btn")).toBeVisible({ timeout: 15_000 });
  await page.locator("#device-hub-check-live-proof-btn").click();
  await expect.poll(() => challengeCounter.get(), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#device-hub-network-status-line")).toContainText(/Live proof checked/i, {
    timeout: 15_000,
  });
}

test.describe("device live proof tab sync", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("follower tab skips challenge GET after leader Check for live proof", async ({ context }) => {
    const followerCounter = createChallengeCounter();
    const leaderCounter = createChallengeCounter();

    const pageFollower = await openLandingTab(context, followerCounter);
    await waitForShellReady(pageFollower);
    const pageLeader = await openLandingTab(context, leaderCounter);
    await waitForShellReady(pageLeader);

    await leaderCheckLiveProof(pageLeader, leaderCounter);

    await expect
      .poll(async () =>
        pageFollower.evaluate(() => sessionStorage.getItem("hc_live_proof_checked_at"))
      )
      .not.toBeNull();

    followerCounter.reset();
    await pageFollower.bringToFront();
    await expandHub(pageFollower);

    await expect(pageFollower.locator("#device-hub-network-status-line")).toContainText(
      /Live proof checked/i,
      { timeout: 15_000 }
    );
    expect(followerCounter.get()).toBe(0);

    await pageLeader.close();
    await pageFollower.close();
  });

  test("live proof checked-at survives reload in the same tab", async ({ context }) => {
    const counter = createChallengeCounter();
    const page = await context.newPage();
    await seedWallet(page, { clearCheckedAt: false });
    await wireShellRoutes(page, counter);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHubIntro(page);
    await waitForShellReady(page);

    await leaderCheckLiveProof(page, counter);
    const before = await page.evaluate(() => sessionStorage.getItem("hc_live_proof_checked_at"));
    expect(before).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForShellReady(page);
    await expandHub(page);

    await expect(page.locator("#device-hub-network-status-line")).toContainText(/Live proof checked/i, {
      timeout: 15_000,
    });
    const after = await page.evaluate(() => sessionStorage.getItem("hc_live_proof_checked_at"));
    expect(after).toBe(before);

    await page.close();
  });
});

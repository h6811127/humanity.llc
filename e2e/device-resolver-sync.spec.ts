import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * Phase 1a/2 resolver tab sync — follower skips duplicate status GETs within 60s.
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md
 * @see docs/DEVICE_OS_QA.md P1-1
 */

const WALLET_ENTRY = {
  id: "e2e_resolver_sync_wallet",
  label: "E2E Resolver Sync Card",
  saved_at: "2026-05-27T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eResolverSyncTest",
  handle: "e2eresolversync",
  manifesto_line: "Resolver sync test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eResolverSyncTest",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

function cardStatusBody() {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: WALLET_ENTRY.profile_id,
      qr_id: WALLET_ENTRY.qr_id,
      card: {
        status: "active",
        handle: WALLET_ENTRY.handle,
        manifesto_line: WALLET_ENTRY.manifesto_line,
      },
      verification: { state: "registered", label: "Registered" },
      human_trust: { label: "Registered", subtitle: "", pill_active: false },
    },
  };
}

function createStatusCounter() {
  let count = 0;
  return {
    get: () => count,
    reset: () => {
      count = 0;
    },
    fulfill: async (route: Route) => {
      count += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(cardStatusBody()),
      });
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

async function mockNoLiveProof(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    await route.continue();
    return;
  }
  await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function wireShellRoutes(page: Page, statusCounter: ReturnType<typeof createStatusCounter>) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
    statusCounter.fulfill(route)
  );
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoLiveProof);
}

async function dismissHubIntro(page: Page) {
  const dismiss = page.locator("#device-hub-intro-dismiss");
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
}

async function expandHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
    timeout: 15_000,
  });
}

type LandingTabOpts = {
  syncEnabled?: boolean;
};

async function seedResolverSyncStorage(page: Page, syncEnabled: boolean) {
  await page.addInitScript(({ entry, syncOn }) => {
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_resolver_sync_tabs", syncOn ? "1" : "0");
    localStorage.setItem("hc_watch_live_proof", "0");
    sessionStorage.removeItem("hc_wallet_network_cache");
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("hc_resolver_etag:")) sessionStorage.removeItem(key);
    }
  }, { entry: WALLET_ENTRY, syncOn: syncEnabled });
}

async function openFollowerLanding(
  context: BrowserContext,
  statusCounter: ReturnType<typeof createStatusCounter>,
  opts: LandingTabOpts = {}
) {
  const syncEnabled = opts.syncEnabled !== false;
  const page = await context.newPage();
  await seedResolverSyncStorage(page, syncEnabled);
  await wireShellRoutes(page, statusCounter);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await dismissHubIntro(page);
  return page;
}

async function openLeaderWallet(
  context: BrowserContext,
  statusCounter: ReturnType<typeof createStatusCounter>,
  opts: LandingTabOpts = {}
) {
  const syncEnabled = opts.syncEnabled !== false;
  const page = await context.newPage();
  await seedResolverSyncStorage(page, syncEnabled);
  await wireShellRoutes(page, statusCounter);
  await page.goto("/wallet/", { waitUntil: "domcontentloaded" });
  await dismissHubIntro(page);
  return page;
}

async function waitForLeaderNetworkPoll(
  page: Page,
  statusCounter: ReturnType<typeof createStatusCounter>
) {
  await expect
    .poll(() => statusCounter.get(), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(1);
  await expect(page.locator(".hub-card-status-label").first()).toContainText("Reachable", {
    timeout: 15_000,
  });
}

test.describe("device resolver tab sync (phase 1a)", () => {
  test.describe.configure({ mode: "serial", timeout: 60_000 });

  test("follower tab skips status GET after leader Check network (sync on)", async ({
    context,
  }) => {
    const followerCounter = createStatusCounter();
    const leaderCounter = createStatusCounter();

    const pageFollower = await openFollowerLanding(context, followerCounter, { syncEnabled: true });
    const pageLeader = await openLeaderWallet(context, leaderCounter, { syncEnabled: true });

    await waitForLeaderNetworkPoll(pageLeader, leaderCounter);

    await expect
      .poll(
        async () =>
          pageFollower.evaluate((pid) => {
            try {
              const raw = sessionStorage.getItem("hc_wallet_network_cache");
              if (!raw) return false;
              const map = JSON.parse(raw);
              return map[pid]?.status === "active";
            } catch {
              return false;
            }
          }, WALLET_ENTRY.profile_id),
        { timeout: 10_000 }
      )
      .toBe(true);

    followerCounter.reset();
    await pageFollower.bringToFront();
    await expandHub(pageFollower);

    await expect(pageFollower.locator(".hub-card-status-label").first()).toContainText(
      "Reachable",
      { timeout: 15_000 }
    );
    expect(followerCounter.get()).toBe(0);

    await pageLeader.close();
    await pageFollower.close();
  });

  test("follower tab fetches status when sync is off", async ({ context }) => {
    const followerCounter = createStatusCounter();
    const leaderCounter = createStatusCounter();

    const pageFollower = await openFollowerLanding(context, followerCounter, { syncEnabled: false });
    const pageLeader = await openLeaderWallet(context, leaderCounter, { syncEnabled: false });

    await waitForLeaderNetworkPoll(pageLeader, leaderCounter);

    followerCounter.reset();
    await pageFollower.bringToFront();
    await expandHub(pageFollower);

    await expect(pageFollower.locator(".hub-card-status-label").first()).toContainText(
      "Reachable",
      { timeout: 15_000 }
    );
    expect(followerCounter.get()).toBeGreaterThanOrEqual(1);

    await pageLeader.close();
    await pageFollower.close();
  });

  test("landing toggle off restores per-tab polling", async ({ context }) => {
    const followerCounter = createStatusCounter();
    const leaderCounter = createStatusCounter();

    const pageFollower = await openFollowerLanding(context, followerCounter, { syncEnabled: true });
    const pageLeader = await context.newPage();
    await seedResolverSyncStorage(pageLeader, true);
    await wireShellRoutes(pageLeader, leaderCounter);
    await pageLeader.goto("/", { waitUntil: "domcontentloaded" });
    await dismissHubIntro(pageLeader);
    await pageLeader.locator("#device-resolver-sync-toggle").click();
    await expect(pageLeader.locator("#device-resolver-sync-toggle")).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    await pageLeader.goto("/wallet/", { waitUntil: "domcontentloaded" });
    await waitForLeaderNetworkPoll(pageLeader, leaderCounter);

    followerCounter.reset();
    await pageFollower.bringToFront();
    await expandHub(pageFollower);

    await expect(pageFollower.locator(".hub-card-status-label").first()).toContainText(
      "Reachable",
      { timeout: 15_000 }
    );
    expect(followerCounter.get()).toBeGreaterThanOrEqual(1);

    await pageLeader.close();
    await pageFollower.close();
  });
});

import { expect, test, type Route } from "@playwright/test";

const WALLET_ENTRY = {
  id: "hosted_e2_wallet_1",
  label: "Hosted E2 Test Card",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_HostedTierE2e9",
  handle: "hostede2",
  manifesto_line: "Hosted tier test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_HostedTierE2e9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

const HOSTED_ENTITLEMENTS_BODY = {
  plan_id: "hosted_steward_v1",
  status: "active",
  entitlements: {
    "steward.hosted": true,
    "notify.push.live_proof": true,
    "poll.live_proof.auto_daily_cap": 4000,
    "poll.live_proof.idle_ms": 30_000,
    "poll.live_proof.active_ms": 5000,
    "poll.network.max_parallel": 5,
    "poll.network.manual_max_parallel": 3,
    "wallet.large_threshold": 25,
    "sw.periodic_min_ms": 300_000,
  },
};

const FREE_ENTITLEMENTS_BODY = {
  plan_id: "reference_free",
  status: "active",
  entitlements: {
    "steward.hosted": false,
    "notify.push.live_proof": false,
    "poll.live_proof.auto_daily_cap": 400,
    "poll.live_proof.idle_ms": 60_000,
    "poll.live_proof.active_ms": 5000,
    "poll.network.max_parallel": 2,
    "poll.network.manual_max_parallel": 1,
    "wallet.large_threshold": 10,
    "sw.periodic_min_ms": 900_000,
  },
};

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

function mockCardStatus(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
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
    }),
  });
}

async function installCommonRoutes(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function installWalletWithKeys(page: import("@playwright/test").Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_device_id", "device-e2e-hosted");
    sessionStorage.setItem("hc_created", JSON.stringify(entry));
    sessionStorage.setItem("hc_steward_session", JSON.stringify({ token: "session-e2e" }));
  }, WALLET_ENTRY);
}

async function readBudgetSnapshot(page: import("@playwright/test").Page, force = true) {
  return page.evaluate(async (forceRefresh) => {
    const entitlements = await import("/js/device-steward-entitlements.mjs");
    const scheduler = await import("/js/device-live-control-poll-scheduler.mjs");
    const budget = await import("/js/device-live-control-poll-budget-core.mjs");
    const scale = await import("/js/device-wallet-scale-core.mjs");
    const sw = await import("/js/device-live-control-sw-core.mjs");
    const policy = await entitlements.refreshStewardEntitlements({ force: forceRefresh });
    const atCap = budget.liveControlAutoPollBudgetSerializedAtCap(
      policy.pollLiveProofAutoDailyCap,
      Date.UTC(2026, 4, 27)
    );
    return {
      stewardHosted: policy.stewardHosted,
      pushAllowed: entitlements.stewardPushSubscribeAllowed(policy),
      cap: policy.pollLiveProofAutoDailyCap,
      idleMs: scheduler.liveControlPollIntervalMs(0, policy),
      activeMs: scheduler.liveControlPollIntervalMs(1, policy),
      walletLargeThreshold: policy.walletLargeThreshold,
      isTwentyLarge: scale.isLargeWallet(20, policy),
      networkMaxParallel: scale.walletNetworkMaxParallel(30, {}, policy),
      networkManualMaxParallel: scale.walletNetworkMaxParallel(30, { manual: true }, policy),
      swPeriodicMinMs: sw.resolveSwPeriodicMinIntervalMs(policy),
      budgetPausedAtCap: budget.isLiveControlAutoPollBudgetExhausted(
        atCap,
        Date.UTC(2026, 4, 27),
        policy.pollLiveProofAutoDailyCap
      ),
    };
  }, force);
}

test.describe("hosted tier E2 budget policy", () => {
  test("H1 uses reference_free caps when no steward session exists", async ({ page }) => {
    await installCommonRoutes(page);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      sessionStorage.setItem("hc_created", JSON.stringify(entry));
      sessionStorage.removeItem("hc_steward_session");
    }, WALLET_ENTRY);
    let entitlementRequests = 0;
    await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) => {
      entitlementRequests += 1;
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: "{}",
      });
    });

    await page.goto("/wallet/");
    const snapshot = await readBudgetSnapshot(page);

    expect(snapshot).toMatchObject({
      stewardHosted: false,
      pushAllowed: false,
      cap: 400,
      idleMs: 60_000,
      activeMs: 5_000,
      walletLargeThreshold: 10,
      isTwentyLarge: true,
      networkMaxParallel: 2,
      networkManualMaxParallel: 1,
      swPeriodicMinMs: 900_000,
      budgetPausedAtCap: true,
    });
    expect(entitlementRequests).toBe(0);
  });

  test("H2 applies hosted_steward_v1 caps from the entitlements API", async ({ page }) => {
    await installCommonRoutes(page);
    await installWalletWithKeys(page);
    const entitlementHeaders: Record<string, string>[] = [];
    await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) => {
      entitlementHeaders.push(route.request().headers());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { ETag: '"hosted-e2e"' },
        body: JSON.stringify(HOSTED_ENTITLEMENTS_BODY),
      });
    });

    await page.goto("/wallet/");
    const snapshot = await readBudgetSnapshot(page);

    expect(snapshot).toMatchObject({
      stewardHosted: true,
      pushAllowed: true,
      cap: 4000,
      idleMs: 30_000,
      activeMs: 5_000,
      walletLargeThreshold: 25,
      isTwentyLarge: false,
      networkMaxParallel: 5,
      networkManualMaxParallel: 3,
      swPeriodicMinMs: 300_000,
      budgetPausedAtCap: true,
    });
    expect(entitlementHeaders.at(-1)?.authorization).toBe("Bearer session-e2e");
    expect(entitlementHeaders.at(-1)?.["x-hc-device-id"]).toBe("device-e2e-hosted");
  });

  test("H3 downgrades back to reference_free on the next entitlement fetch", async ({
    page,
  }) => {
    await installCommonRoutes(page);
    await installWalletWithKeys(page);
    let entitlementBody = HOSTED_ENTITLEMENTS_BODY;
    await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(entitlementBody),
      })
    );

    await page.goto("/wallet/");
    await expect(await readBudgetSnapshot(page)).toMatchObject({
      stewardHosted: true,
      cap: 4000,
      idleMs: 30_000,
    });

    entitlementBody = FREE_ENTITLEMENTS_BODY;
    await expect(await readBudgetSnapshot(page)).toMatchObject({
      stewardHosted: false,
      pushAllowed: false,
      cap: 400,
      idleMs: 60_000,
      walletLargeThreshold: 10,
    });
  });

  test("H5 anonymous create remains available without hosted entitlement calls", async ({
    page,
  }) => {
    await installCommonRoutes(page);
    let entitlementRequests = 0;
    await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) => {
      entitlementRequests += 1;
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: "{}",
      });
    });

    await page.goto("/create/");

    await expect(page.getByRole("heading", { name: "Create a live card" })).toBeVisible();
    await expect(page.locator("#submit")).toBeVisible();
    await expect(page.getByText(/paywall|premium verified/i)).toHaveCount(0);
    expect(entitlementRequests).toBe(0);
  });
});

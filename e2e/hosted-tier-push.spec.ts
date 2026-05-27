import { test, expect, type BrowserContext, type Page, type Route } from "@playwright/test";

/**
 * Hosted tier SSE push (E4) — M7 H4 exit tests.
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § E4
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */

const PAGES_ORIGIN = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788"
).origin;

const WALLET_ENTRY = {
  id: "e2e_push_wallet_1",
  label: "E2E Push Test Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2ePushTestCard9",
  handle: "e2epush",
  manifesto_line: "Push tier test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2ePushTestCard9",
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

async function grantBrowserNotifications(context: BrowserContext) {
  await context.grantPermissions(["notifications"], { origin: PAGES_ORIGIN });
  await context.addInitScript(() => {
    if (typeof Notification === "undefined") return;
    const Native = window.Notification;
    function WrappedNotification(title, options) {
      return new Native(title, options);
    }
    WrappedNotification.permission = "granted";
    WrappedNotification.requestPermission = Native.requestPermission.bind(Native);
    window.Notification = WrappedNotification;
  });
}

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

async function installCommonRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", mockHealth);
  await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
  await page.route("**/.well-known/hc/v1/steward/entitlements**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { ETag: '"hosted-push-e2e"' },
      body: JSON.stringify(HOSTED_ENTITLEMENTS_BODY),
    })
  );
  await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
  );
}

async function installHostedPushFetchMock(page: Page, withSession: boolean) {
  await page.addInitScript(
    ({ entry, withStewardSession }) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_device_id", "device-e2e-push");
      localStorage.setItem("hc_watch_live_proof", "1");
      localStorage.setItem("hc_browser_notif", "on");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
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
      if (withStewardSession) {
        sessionStorage.setItem(
          "hc_steward_session",
          JSON.stringify({ token: "session-e2e-push" })
        );
      } else {
        sessionStorage.removeItem("hc_steward_session");
      }

      window.__hcE2ePushFetchCount = 0;
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input?.url ?? "";
        if (url.includes("/steward/push")) {
          window.__hcE2ePushFetchCount += 1;
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              window.__hcE2ePushController = controller;
              window.__hcE2ePushEncoder = encoder;
              controller.enqueue(
                encoder.encode(
                  `event: connection\ndata: ${JSON.stringify({
                    type: "connection.ack",
                    version: 1,
                    operator_id: "humanity.llc",
                    account_id: "acc_e2e_push",
                    connection_id: "conn_e2e_push",
                  })}\n\n`
                )
              );
            },
          });
          return new Response(stream, {
            status: 200,
            headers: { "Content-Type": "text/event-stream; charset=utf-8" },
          });
        }
        return nativeFetch(input, init);
      };
    },
    { entry: WALLET_ENTRY, withStewardSession: withSession }
  );
}

async function openExpandedHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click({ timeout: 15_000 });
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, {
    timeout: 15_000,
  });
}

async function waitForPushHealthy(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const mod = await import("/js/device-steward-push.mjs");
        return mod.isStewardPushHealthy();
      })
    )
    .toBe(true);
}

async function readAutoPollShouldRun(page: Page) {
  return page.evaluate(async () => {
    const push = await import("/js/device-steward-push.mjs");
    const scheduler = await import("/js/device-live-control-poll-scheduler.mjs");
    const network = await import("/js/device-hub-network-tools-core.mjs");
    return scheduler.liveControlAutoPollShouldRun({
      watchEnabled: network.isWatchLiveProofEnabled(),
      scopeActive: true,
      resolverHealth: "ok",
      budgetExhausted: false,
      isPollLeader: true,
      stewardPushHealthy: push.isStewardPushHealthy(),
    });
  });
}

test.describe("hosted tier E4 push (SSE)", () => {
  test.beforeEach(async ({ context }) => {
    await grantBrowserNotifications(context);
  });

  test("H4 free tier does not open steward push SSE", async ({ page }) => {
    await installHostedPushFetchMock(page, false);
    await installCommonRoutes(page);

    await page.goto("/wallet/");
    await page.waitForTimeout(2000);

    const pushFetchCount = await page.evaluate(() => window.__hcE2ePushFetchCount ?? 0);
    expect(pushFetchCount).toBe(0);
  });

  test("H4 healthy push suppresses auto poll while watch is on", async ({ page }) => {
    await installHostedPushFetchMock(page, true);
    await installCommonRoutes(page);

    let challengeGets = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeGets += 1;
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    await page.goto("/");
    await openExpandedHub(page);
    await waitForPushHealthy(page);

    expect(await readAutoPollShouldRun(page)).toBe(false);

    const baseline = challengeGets;
    await page.waitForTimeout(3500);
    expect(challengeGets).toBe(baseline);
  });

  test("H4 live_proof.pending triggers one targeted challenge GET", async ({ page }) => {
    await installHostedPushFetchMock(page, true);
    await installCommonRoutes(page);

    let challengeGets = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeGets += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          challenge_id: "lc_push_e2e",
          status: "pending",
          owner_url: null,
        }),
      });
    });

    await page.goto("/");
    await openExpandedHub(page);
    await waitForPushHealthy(page);

    const baseline = challengeGets;

    await page.evaluate(
      ({ profileId, qrId }) => {
        const encoder = window.__hcE2ePushEncoder;
        const controller = window.__hcE2ePushController;
        if (!encoder || !controller) throw new Error("push mock stream missing");
        const payload = {
          type: "live_proof.pending",
          version: 1,
          profile_id: profileId,
          qr_id: qrId,
          challenge_id: "lc_push_e2e",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        };
        controller.enqueue(
          encoder.encode(`event: live_proof\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      },
      { profileId: WALLET_ENTRY.profile_id, qrId: WALLET_ENTRY.qr_id }
    );

    await expect.poll(() => challengeGets).toBeGreaterThan(baseline);
    expect(challengeGets - baseline).toBe(1);
  });
});

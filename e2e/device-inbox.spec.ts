import { test, expect, type BrowserContext, type Route } from "@playwright/test";

const PAGES_ORIGIN = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8788"
).origin;

/** Chromium in CI often keeps Notification.permission "denied" despite grantPermissions. */
async function grantBrowserNotifications(context: BrowserContext) {
  await context.grantPermissions(["notifications"], { origin: PAGES_ORIGIN });
  await context.addInitScript(() => {
    if (typeof Notification === "undefined") return;
    const Native = window.Notification;
    /** @type {{ title: string, body: string, click: () => void }[]} */
    window.__hcE2eNotifications = [];
    function WrappedNotification(title, options) {
      const n = new Native(title, options);
      const record = {
        title: String(title),
        body: options?.body ? String(options.body) : "",
        click() {
          if (typeof n.onclick === "function") n.onclick.call(n);
        },
      };
      window.__hcE2eNotifications.push(record);
      return n;
    }
    WrappedNotification.permission = "granted";
    WrappedNotification.requestPermission = Native.requestPermission.bind(Native);
    window.Notification = WrappedNotification;
  });
}

const WALLET_ENTRY = {
  id: "e2e_inbox_1",
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

const CHALLENGE_ID = "e2e_live_proof_challenge";

function mockHealth(route: Route, status: "ok" | "offline" | "degraded") {
  // The client treats non-2xx as "offline". It treats body.status === "degraded" as "degraded".
  const httpStatus = status === "offline" ? 503 : 200;
  return route.fulfill({
    status: httpStatus,
    contentType: "application/json",
    body: JSON.stringify({ status, database: "ok" }),
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

function mockPendingChallenge(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    return route.continue();
  }
  const signUrl = new URL("/created/", "http://127.0.0.1:8788");
  signUrl.searchParams.set("profile_id", WALLET_ENTRY.profile_id);
  signUrl.searchParams.set("qr_id", WALLET_ENTRY.qr_id);
  signUrl.searchParams.set("live_challenge", CHALLENGE_ID);
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "pending",
      challenge_id: CHALLENGE_ID,
      owner_url: signUrl.href,
      return_url: WALLET_ENTRY.scan_url,
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    }),
  });
}

function mockNoChallenge(route: Route) {
  const url = route.request().url();
  if (!url.includes("/live-control/challenges")) {
    return route.continue();
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
}

async function waitForLiveProofChrome(page: import("@playwright/test").Page) {
  const badge = page.locator("#shell-notif-badge");
  await expect(badge).toBeVisible({ timeout: 15_000 });
  await expect(badge).toHaveAttribute("data-inbox-chroma", "live_proof");
  await expect(page.locator("#brand-status-dot")).toHaveAttribute(
    "data-dot-overlay",
    "proof_waiting"
  );
  return badge;
}

async function openHubViaStatusDot(page: import("@playwright/test").Page) {
  // Sometimes the first-visit coachmark overlays the status dot; dismiss it first
  // so the click reliably opens the hub sheet.
  const dismiss = page.locator("#device-hub-intro-dismiss");
  // Coachmark has a small show delay, so give it a moment to appear.
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click();
  }
  await page.locator("#brand-status-dot-btn").click();
}

test.describe("device inbox - live proof", () => {
  test.beforeEach(async ({ page, context }) => {
    await grantBrowserNotifications(context);
    await page.addInitScript((entry) => {
      localStorage.removeItem("hc_browser_notif_prompt_dismissed");
      localStorage.setItem("hc_browser_notif", "off");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("shows badge chroma and descriptive aria-label when proof pending", async ({ page }) => {
    await page.goto("/wallet/");
    const badge = await waitForLiveProofChrome(page);
    await expect(badge).toHaveAttribute("aria-label", /live proof/i);
    await expect(badge).toHaveAttribute("aria-label", /Needs attention/i);
  });

  test("badge opens inbox sheet with proof row and navigates to sign", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await page.locator("#shell-notif-badge").click();
    const sheet = page.locator("#device-inbox-sheet");
    await expect(sheet).not.toHaveClass(/device-inbox-sheet--collapsed/);
    const row = page.locator(".device-inbox-sheet-row--live_proof");
    await expect(row).toBeVisible();
    await expect(row.getByText("E2E Test Card")).toBeVisible();
    await expect(row.getByText(/Someone is waiting/)).toBeVisible();
    await row.locator("button").click();
    await expect(page).toHaveURL(new RegExp(`live_challenge=${CHALLENGE_ID}`));
    await expect(page).toHaveURL(/profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
  });

  test("hub shows live proof waiting group", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await expect(page.locator("#device-hub-live-control-group")).toBeVisible();
    await expect(page.getByText("Live proof waiting")).toBeVisible();
    await expect(
      page.locator("#device-hub-live-control-group").getByText("E2E Test Card")
    ).toBeVisible();
  });

  test("inbox sheet footer shows contextual background alerts prompt", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await page.locator("#shell-notif-badge").click();
    await expect(page.locator("#device-inbox-sheet-footer")).toBeVisible();
    await expect(
      page.locator("#device-inbox-sheet-footer .device-browser-notif-prompt-enable")
    ).toBeVisible();
  });

  test("Not now dismisses background alerts prompt in inbox sheet", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await page.locator("#shell-notif-badge").click();
    await page.locator("#device-inbox-sheet-footer .device-browser-notif-prompt-dismiss").click();
    await expect(
      page.locator("#device-inbox-sheet-footer .device-browser-notif-prompt-enable")
    ).toBeHidden();
    expect(
      await page.evaluate(() => localStorage.getItem("hc_browser_notif_prompt_dismissed"))
    ).toBe("1");
  });
});

async function openInboxSheetForE2e(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const { setInboxSheetOpen } = await import("/js/device-inbox-sheet.mjs");
    setInboxSheetOpen(true);
  });
}

test.describe("device inbox - sheet reconcile (P5e / phase 14)", () => {
  test("backdrop close clears body class and hides backdrop", async ({ page }) => {
    await page.goto("/wallet/");
    await openInboxSheetForE2e(page);
    const sheet = page.locator("#device-inbox-sheet");
    const backdrop = page.locator("#device-inbox-backdrop");
    await expect(sheet).not.toHaveClass(/device-inbox-sheet--collapsed/);
    await expect(backdrop).toBeVisible();
    await backdrop.evaluate((el) => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await expect(page.locator("body")).not.toHaveClass(/device-inbox-sheet-open/);
    await expect(sheet).toHaveClass(/device-inbox-sheet--collapsed/);
    await expect(backdrop).toBeHidden();
  });

  test("pageshow bfcache reconcile clears stuck inbox-open chrome", async ({ page }) => {
    await page.goto("/wallet/");
    await openInboxSheetForE2e(page);
    await expect(page.locator("#device-inbox-sheet")).not.toHaveClass(
      /device-inbox-sheet--collapsed/
    );

    await page.evaluate(() => {
      const sheet = document.getElementById("device-inbox-sheet");
      sheet?.classList.add("device-inbox-sheet--collapsed");
      document.body.classList.add("device-inbox-sheet-open");
      document.getElementById("top-chrome")?.classList.add("top-chrome--inbox-locked");
      const backdrop = document.getElementById("device-inbox-backdrop");
      if (backdrop) {
        backdrop.hidden = false;
        backdrop.classList.add("is-visible");
      }
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    await expect(page.locator("body")).not.toHaveClass(/device-inbox-sheet-open/);
    await expect(page.locator("#top-chrome")).not.toHaveClass(/top-chrome--inbox-locked/);
    await expect(page.locator("#device-inbox-backdrop")).toBeHidden();
    await expect(page.locator("#device-inbox-backdrop")).not.toHaveClass(/is-visible/);
  });
});

test.describe("device inbox - background OS notification", () => {
  test.beforeEach(async ({ page, context }) => {
    await grantBrowserNotifications(context);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_browser_notif", "on");
      localStorage.setItem("hc_browser_notif_prompt_dismissed", "1");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("OS notification when tab hidden uses card title and sign deep link", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    await expect(page.locator("#shell-notif-badge")).toBeVisible({ timeout: 15_000 });

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get() {
          return "hidden";
        },
      });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("hc-live-control-inbox-changed"));
    });

    await expect
      .poll(async () =>
        page.evaluate(() => (window.__hcE2eNotifications ?? []).length)
      )
      .toBeGreaterThan(0);

    const notification = await page.evaluate(() => window.__hcE2eNotifications[0]);
    expect(notification.title).toBe("E2E Test Card");
    expect(notification.body).toMatch(/tap to sign/i);

    await page.evaluate(() => window.__hcE2eNotifications[0].click());
    await expect(page).toHaveURL(new RegExp(`live_challenge=${CHALLENGE_ID}`));
    await expect(page).toHaveURL(/profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
  });
});

function mockCardRevokedSinceVisit(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      version: "1.0",
      resolver: { operator: "humanity.llc", version: "1.0" },
      scan: {
        kind: "card_revoked",
        profile_id: WALLET_ENTRY.profile_id,
        qr_id: WALLET_ENTRY.qr_id,
        card: {
          status: "revoked",
          handle: WALLET_ENTRY.handle,
          manifesto_line: WALLET_ENTRY.manifesto_line,
        },
        verification: { state: "registered", label: "Registered" },
        human_trust: { label: "Registered", subtitle: "", pill_active: false },
      },
    }),
  });
}

test.describe("device inbox - card disabled since visit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [entry.profile_id]: "active" })
      );
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardRevokedSinceVisit);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoChallenge);
  });

  test("badge and inbox sheet surface card disabled since last visit", async ({ page }) => {
    await page.goto("/wallet/");
    const badge = page.locator("#shell-notif-badge");
    await expect(badge).toBeVisible({ timeout: 15_000 });
    await expect(badge).toHaveAttribute("data-inbox-chroma", "default");
    await expect(badge).toHaveAttribute("aria-label", /card disabled since last visit/i);
    await expect(page.locator("#brand-status-dot")).toHaveAttribute(
      "data-dot-overlay",
      "card_disabled_since_visit"
    );

    const hubGroup = page.locator("#device-hub-card-disabled-group");
    await expect(hubGroup).toBeVisible();
    await expect(hubGroup.getByText("E2E Test Card")).toBeVisible();
    await expect(hubGroup.locator(".list-sub")).toContainText(/since your last visit/i);

    await badge.click();
    const row = page.locator(".device-inbox-sheet-row--card_disabled_since_visit");
    await expect(row).toBeVisible();
    await expect(row.getByText("E2E Test Card")).toBeVisible();
    await expect(row.getByText(/since your last visit/i)).toBeVisible();
    await row.locator("button").click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
  });

  test("does not surface inbox or hub card-disabled UI when stale cache says card_revoked but resolver is active", async ({
    page,
  }) => {
    await page.addInitScript((entry) => {
      const now = Date.now();
      sessionStorage.setItem(
        "hc_wallet_network_cache",
        JSON.stringify({
          [entry.profile_id]: {
            status: "active",
            scanKind: "card_revoked",
            verificationLabel: null,
            verificationState: null,
            at: now,
          },
        })
      );
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);

    await page.goto("/wallet/");
    await expect(page.getByText("Reachable")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#shell-notif-badge")).toBeHidden({ timeout: 8_000 });
    await expect(page.locator("#brand-status-dot")).not.toHaveAttribute(
      "data-dot-overlay",
      "card_disabled_since_visit"
    );
    await expect(page.locator("#device-hub-card-disabled-group")).toBeHidden();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });
});

test.describe("device inbox - resolver offline", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "offline"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoChallenge);
  });

  test("does not show badge when only resolver is offline", async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);

    await page.goto("/wallet/");
    await expect(page.locator("#shell-notif-badge")).toBeHidden({ timeout: 8_000 });
  });
});

test.describe("device inbox - card disabled since visit suppressed when resolver offline/degraded", () => {
  async function setup(page, resolverHealth: "offline" | "degraded") {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [entry.profile_id]: "active" })
      );
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, WALLET_ENTRY);

    await page.route("**/.well-known/hc/v1/health**", (route) =>
      mockHealth(route, resolverHealth)
    );
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardRevokedSinceVisit);
    await page.route(
      "**/.well-known/hc/v1/cards/**/live-control/challenges**",
      mockNoChallenge
    );
  }

  test("hides since-visit UI when resolver is offline", async ({ page }) => {
    await setup(page, "offline");
    await page.goto("/wallet/");

    await expect(page.locator("#shell-notif-badge")).toBeHidden({ timeout: 8_000 });
    await expect(page.locator("#device-hub-card-disabled-group")).toBeHidden();
    await expect(page.locator("#brand-status-dot")).not.toHaveAttribute(
      "data-dot-overlay",
      "card_disabled_since_visit"
    );
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);
  });

  test("hides since-visit UI when resolver is degraded (resolver limited)", async ({
    page,
  }) => {
    await setup(page, "degraded");
    await page.goto("/wallet/");

    await expect(page.locator("#shell-notif-badge")).toBeHidden({ timeout: 8_000 });
    await expect(page.locator("#device-hub-card-disabled-group")).toBeHidden();
    await expect(page.locator("#brand-status-dot")).not.toHaveAttribute(
      "data-dot-overlay",
      "card_disabled_since_visit"
    );
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
    await expect(page.locator(".hub-card-status-alert:not([hidden])")).toHaveCount(0);
  });
});

test.describe("device inbox - live proof poll scope (request budget phases 1–3)", () => {
  test.beforeEach(async ({ page, context }) => {
    await grantBrowserNotifications(context);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      sessionStorage.setItem("hc_hub_open", "0");
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoChallenge);
  });

  test("landing with collapsed hub does not poll live-control for 10s", async ({ page }) => {
    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await expect(page.locator("#device-hub")).toHaveClass(/device-hub-collapsed/);
    await page.waitForTimeout(10_000);
    expect(challengeFetches).toBe(0);
  });

  test("landing polls live-control after hub expands when watch is on", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("hc_watch_live_proof", "1");
    });

    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await expect.poll(() => challengeFetches, { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test("expanded hub fetches one live-control challenge per tick (3 cards)", async ({
    page,
  }) => {
    const profileIds = [
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD7",
    ];
    const entries = [0, 1, 2].map((i) => ({
      ...WALLET_ENTRY,
      id: `e2e_inbox_rr_${i}`,
      label: `E2E Card ${i}`,
      profile_id: profileIds[i],
      qr_id: `qr_E2eWakketTest${i + 7}`,
      scan_url: `http://127.0.0.1:8787/c/${profileIds[i]}?q=qr_E2eWakketTest${i + 7}`,
    }));

    await page.addInitScript((wallet) => {
      localStorage.setItem("hc_wallet", JSON.stringify(wallet));
      localStorage.setItem("hc_watch_live_proof", "1");
      sessionStorage.setItem("hc_hub_open", "0");
    }, entries);

    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await expect.poll(() => challengeFetches, { timeout: 15_000 }).toBe(1);
    await page.waitForTimeout(2000);
    expect(challengeFetches).toBe(1);
  });

  test("expanded hub does not auto-poll when Watch for live proof is off", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("hc_watch_live_proof", "0");
    });

    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await expect(page.locator("#device-hub-check-live-proof-btn")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(10_000);
    expect(challengeFetches).toBe(0);
  });

  test("expanded hub does not poll live-control when resolver health is degraded", async ({
    page,
  }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      mockHealth(route, "degraded")
    );

    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await page.waitForTimeout(5000);
    expect(challengeFetches).toBe(0);
  });
});

test.describe("device inbox - live proof watch toggle (request budget phase 5)", () => {
  test("expanded hub does not auto-poll until watch is enabled (default off)", async ({
    page,
  }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      sessionStorage.setItem("hc_hub_open", "0");
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);

    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await expect(page.locator("#device-hub-watch-live-proof")).not.toBeChecked();
    await page.waitForTimeout(10_000);
    expect(challengeFetches).toBe(0);
  });

  test.beforeEach(async ({ page, context }) => {
    await grantBrowserNotifications(context);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_watch_live_proof", "0");
      sessionStorage.setItem("hc_hub_open", "0");
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockNoChallenge);
  });

  test("Check for live proof runs one challenge fetch when watch is off", async ({ page }) => {
    let challengeFetches = 0;
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) => {
      challengeFetches += 1;
      return mockNoChallenge(route);
    });

    await page.goto("/");
    await openHubViaStatusDot(page);
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/, { timeout: 15_000 });
    await expect(page.locator("#device-hub-check-live-proof-btn")).toBeVisible({ timeout: 15_000 });
    await page.locator("#device-hub-check-live-proof-btn").click();
    await expect.poll(() => challengeFetches, { timeout: 10_000 }).toBe(1);
  });
});

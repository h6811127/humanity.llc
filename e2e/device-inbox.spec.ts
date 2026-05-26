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

function mockHealth(route: Route, status: "ok" | "offline") {
  return route.fulfill({
    status: 200,
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

test.describe("device inbox — live proof", () => {
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

test.describe("device inbox — sheet reconcile (P5e / phase 14)", () => {
  test.beforeEach(async ({ page, context }) => {
    await grantBrowserNotifications(context);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route, "ok"));
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("backdrop close clears body class and hides backdrop", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await page.locator("#shell-notif-badge").click();
    const sheet = page.locator("#device-inbox-sheet");
    const backdrop = page.locator("#device-inbox-backdrop");
    await expect(sheet).not.toHaveClass(/device-inbox-sheet--collapsed/);
    await expect(backdrop).toBeVisible();
    await backdrop.click();
    await expect(page.locator("body")).not.toHaveClass(/device-inbox-sheet-open/);
    await expect(sheet).toHaveClass(/device-inbox-sheet--collapsed/);
    await expect(backdrop).toBeHidden();
  });

  test("pageshow bfcache reconcile clears stuck inbox-open chrome", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofChrome(page);
    await page.locator("#shell-notif-badge").click();
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

test.describe("device inbox — background OS notification", () => {
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

test.describe("device inbox — card disabled since visit", () => {
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

test.describe("device inbox — resolver offline", () => {
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

import { test, expect, type Route } from "@playwright/test";

const WALLET_ENTRY = {
  id: "e2e_fg_1",
  label: "E2E Foreground Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6",
  qr_id: "qr_E2eForeground9",
  handle: "e2efg",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD6?q=qr_E2eForeground9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

const CHALLENGE_ID = "e2e_foreground_live_proof";

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

async function waitForLiveProofInbox(page: import("@playwright/test").Page) {
  const badge = page.locator("#shell-notif-badge");
  await expect(badge).toBeVisible({ timeout: 15_000 });
  await expect(badge).toHaveAttribute("data-inbox-chroma", "live_proof");
}

test.describe("WS-NOTIF N3 foreground attention strip", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_watch_live_proof", "1");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", mockHealth);
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("wallet shows foreground strip and hides legacy live proof banner", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofInbox(page);

    const strip = page.locator("#device-foreground-attention");
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/Prove live control/i);
    await expect(strip).toContainText(/E2E Foreground Card/i);
    await expect(strip.locator("[data-foreground-attention-cta]")).toHaveText(
      /Prove control now/i
    );

    await expect(page.locator("#device-live-proof-banner")).toBeHidden();
  });

  test("strip CTA opens live proof sign on Now", async ({ page }) => {
    await page.goto("/wallet/");
    await waitForLiveProofInbox(page);

    await page.locator("#device-foreground-attention [data-foreground-attention-cta]").click();
    await expect(page).toHaveURL(new RegExp(`live_challenge=${CHALLENGE_ID}`));
    await expect(page).toHaveURL(/profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD6/);
  });

  test("landing shell shows foreground strip when proof pending", async ({ page }) => {
    await page.goto("/");
    await waitForLiveProofInbox(page);
    await expect(page.locator("#device-foreground-attention")).toBeVisible();
  });

});

test.describe("P1-MOTO-21 browser alerts without Watch", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.removeItem("hc_watch_live_proof");
      localStorage.setItem("hc_browser_notif", "on");
      localStorage.setItem("hc_browser_notif_prompt_dismissed", "1");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", mockHealth);
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("foreground strip when browser alerts on and Watch off", async ({ page }) => {
    await page.goto("/");
    await page.locator("#brand-status-dot").click();
    await page.locator("#device-hub-network-tools-advanced summary").click();
    await page.locator("#device-hub-check-live-proof-btn").click();

    const strip = page.locator("#device-foreground-attention");
    await expect(strip).toBeVisible({ timeout: 15_000 });
    await expect(strip).toContainText(/Prove live control/i);
    await expect(page.locator("#shell-notif-badge")).toBeVisible();
    await expect(page.locator("#shell-notif-badge")).toHaveAttribute(
      "data-inbox-chroma",
      "live_proof"
    );
  });
});

test.describe("WS-NOTIF N3 created shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_watch_live_proof", "1");
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, WALLET_ENTRY);
    await page.route("**/.well-known/hc/v1/health**", mockHealth);
    await page.route("**/.well-known/hc/v1/cards/**/status**", mockCardStatus);
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", mockPendingChallenge);
  });

  test("/created/ shell does not show foreground strip", async ({ page }) => {
    await page.goto(`/created/?profile_id=${WALLET_ENTRY.profile_id}&qr_id=${WALLET_ENTRY.qr_id}`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#device-foreground-attention")).toHaveCount(0);
  });
});

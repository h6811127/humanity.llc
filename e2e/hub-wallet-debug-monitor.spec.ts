import { test, expect, type Route } from "@playwright/test";

/**
 * Hub wallet custody debug (P2-RC-MON) — monitoring triage for closed RC backlog.
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md § Monitoring only
 * @see docs/DEVICE_OS_QA.md P2-RC-MON
 */

const STEWARD_WALLET_ENTRY = {
  id: "e2e_hub_wallet_debug",
  label: "E2E Hub Debug Card",
  saved_at: "2026-05-30T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD7",
  qr_id: "qr_E2eHubWalletDebug1",
  handle: "e2ehubdebug",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
};

function mockHealth(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "ok", database: "ok" }),
  });
}

async function waitForStatusDotReady(page: import("@playwright/test").Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function openHubWithDebug(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) => mockHealth(route));
  await page.goto("/?hc_debug=1");
  await waitForStatusDotReady(page);
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/, { timeout: 15_000 });
  await expect(page.locator("#device-hub-build-stamp")).toBeVisible();
}

test.describe("P2-RC-MON hub wallet debug monitor", () => {
  test("hc_debug shows wallet custody line for stranger-empty wallet", async ({ page }) => {
    await openHubWithDebug(page);
    const walletLine = page.locator("#device-hub-build-stamp-wallet-debug");
    await expect(walletLine).toContainText(/Wallet debug/);
    await expect(walletLine).toContainText(/parse ok/);
  });

  test("Copy build info includes wallet custody debug block", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, STEWARD_WALLET_ENTRY);
    await openHubWithDebug(page);
    await expect(page.locator("#device-hub-build-stamp-wallet-debug")).toContainText(/1 saved/);

    await page.locator("#device-hub-build-stamp-copy").click();
    const copied = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    });
    expect(copied).toMatch(/--- wallet custody debug ---/);
    expect(copied).toMatch(/walletCount=1/);
    expect(copied).toMatch(/likelyRc=/);
  });
});

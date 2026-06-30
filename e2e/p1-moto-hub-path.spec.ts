import { test, expect, type Page } from "@playwright/test";

import { expandHubNetworkToolsAdvanced } from "./helpers/hub-network-tools";

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_moto_hub_1",
  label: "E2E MOTO Hub Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_E2eWakketTest9",
  handle: "e2emoto",
  manifesto_line: "MOTO path test",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

function statusBody() {
  return {
    version: "1.0",
    resolver: { operator: "humanity.llc", version: "1.0" },
    scan: {
      kind: "active",
      profile_id: SAMPLE_WALLET_ENTRY.profile_id,
      qr_id: SAMPLE_WALLET_ENTRY.qr_id,
      card: {
        status: "active",
        handle: SAMPLE_WALLET_ENTRY.handle,
        manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
      },
    },
  };
}

async function stubCreatedResolver(page: Page) {
  await page.route(`**/.well-known/hc/v1/cards/${SAMPLE_WALLET_ENTRY.profile_id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        handle: SAMPLE_WALLET_ENTRY.handle,
        manifesto_line: SAMPLE_WALLET_ENTRY.manifesto_line,
        created_at: "2026-05-25T12:00:00.000Z",
        status: "active",
      }),
    })
  );
}

async function clickOpenControlsOnSavedCard(page: Page) {
  await page
    .locator(".hub-card-item")
    .first()
    .getByRole("button", { name: "Open controls", exact: true })
    .click();
}

test.describe("P1-MOTO-06 hub network checking exit", () => {
  test("Check network resolves Checking network… when status was blocked", async ({ page }) => {
    let allowStatus = false;

    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: { status: "ok" } }),
      })
    );
    await page.route("**/.well-known/hc/v1/cards/**/live-control/challenges**", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
    );
    await page.route("**/.well-known/hc/v1/cards/**/status**", (route) => {
      if (!allowStatus) {
        return route.abort();
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(statusBody()),
      });
    });

    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, SAMPLE_WALLET_ENTRY);

    await page.goto("/");
    await page.locator("#brand-status-dot").click();
    await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);

    const row = page.locator(".hub-card-item").filter({ hasText: SAMPLE_WALLET_ENTRY.label });
    await expect(row).toContainText(/Checking network/i, { timeout: 15_000 });

    await expandHubNetworkToolsAdvanced(page);
    allowStatus = true;
    const refreshStatus = page.waitForResponse(
      (resp) => resp.url().includes("/status") && resp.ok(),
      { timeout: 15_000 }
    );
    await page.getByRole("button", { name: "Check network" }).click();
    await refreshStatus;

    await expect(row).toContainText(/Reachable/i, { timeout: 15_000 });
    await expect(page.locator("#device-hub-network-status-line")).toContainText(
      /Network checked/i,
      { timeout: 15_000 }
    );
  });
});

test.describe("P1-MOTO-07 Open controls return_url sanitize", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/.well-known/hc/v1/health**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ok", database: { status: "ok" } }),
      })
    );
    await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(statusBody()),
      })
    );
    await stubCreatedResolver(page);
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
      localStorage.setItem("hc_setup_done", JSON.stringify({ [entry.profile_id]: true }));
      sessionStorage.setItem("hc_vouch_return_url", "https://humanity.llc/");
    }, SAMPLE_WALLET_ENTRY);
  });

  test("Open controls navigates to /created/ when return_url is homepage", async ({ page }) => {
    await page.goto("/wallet/");
    await clickOpenControlsOnSavedCard(page);

    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
  });
});

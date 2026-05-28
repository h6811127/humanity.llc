import { test, expect, type Page } from "@playwright/test";

const LARGE_WALLET_COUNT = 12;
const SUMMARY_ROW_INITIAL = 8;
const UNIQUE_SEARCH_LABEL = "Xy7UniqLwSearch Card";
const UNIQUE_SEARCH_TOKEN = "Xy7UniqLwSearch";
const LAST_ROW_LABEL = "Last Row Hydrate Card";

const BASE_ENTRY = {
  saved_at: "2026-05-25T12:00:00.000Z",
  handle: "e2etest",
  manifesto_line: "Test line",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

function makeLargeWalletEntries(count = LARGE_WALLET_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const suffix = String(i).padStart(2, "0");
    const profileId = `7Xk9mP2nQ4rT6vW8yZ1aB${suffix}`;
    const qrId = `qr_E2eLargeWallet${suffix}`;
    let label = `E2E Card ${i + 1}`;
    if (i === 2) label = UNIQUE_SEARCH_LABEL;
    if (i === count - 1) label = LAST_ROW_LABEL;
    return {
      ...BASE_ENTRY,
      id: `e2e_lw_${suffix}`,
      label,
      profile_id: profileId,
      qr_id: qrId,
      scan_url: `http://127.0.0.1:8787/c/${profileId}?q=${qrId}`,
    };
  });
}

async function stubResolverRoutes(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
  await page.route("**/.well-known/hc/v1/cards/**/status**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: "1.0",
        resolver: { operator: "humanity.llc", version: "1.0" },
        scan: {
          kind: "active",
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB00",
          qr_id: "qr_E2eLargeWallet00",
          card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
          verification: { state: "registered", label: "Registered" },
          human_trust: { label: "Registered", subtitle: "", pill_active: false },
        },
      }),
    })
  );
}

async function waitForStatusDotReady(page: Page) {
  await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
    timeout: 15_000,
  });
}

async function gotoHome(page: Page) {
  await page.goto("/");
  await waitForStatusDotReady(page);
}

async function openExpandedHub(page: Page) {
  await page.locator("#brand-status-dot-btn").click();
  await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);
  await expect(page.locator("#device-hub")).not.toHaveClass(/device-hub-collapsed/);
}

function summarySavedRows(page: Page) {
  return page.locator(
    "#device-hub-wallet-list .hub-card-item.hub-card-item--summary:not(.hub-card-item--more)"
  );
}

test.describe("P1-LW large-wallet expanded hub summary rows (S12)", () => {
  test.beforeEach(async ({ page }) => {
    const entries = makeLargeWalletEntries();
    await page.addInitScript((walletEntries) => {
      localStorage.setItem("hc_wallet", JSON.stringify(walletEntries));
      localStorage.removeItem("hc_wallet_summary");
      localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    }, entries);
    await stubResolverRoutes(page);
  });

  test("windows summary rows and loads more on demand", async ({ page }) => {
    await gotoHome(page);
    await openExpandedHub(page);

    await expect(page.locator("#device-hub-wallet-list")).toHaveAttribute(
      "data-wallet-rows-mode",
      "summary"
    );
    await expect(summarySavedRows(page)).toHaveCount(SUMMARY_ROW_INITIAL);
    await expect(page.getByRole("button", { name: /Show \d+ more/i })).toBeVisible();

    await page.getByRole("button", { name: /Show \d+ more/i }).click();
    await expect(summarySavedRows(page)).toHaveCount(LARGE_WALLET_COUNT);
    await expect(page.getByRole("button", { name: /Show \d+ more/i })).toHaveCount(0);
  });

  test("search filters summary rows while hub is expanded", async ({ page }) => {
    await gotoHome(page);
    await openExpandedHub(page);

    const savedList = page.locator("#device-hub-wallet-list");
    await page.locator("#device-hub-search").fill(UNIQUE_SEARCH_TOKEN);
    await expect(savedList.getByText(UNIQUE_SEARCH_LABEL)).toBeVisible();
    await expect(savedList.getByText("E2E Card 1")).toBeHidden();
    await expect(
      savedList.locator(".hub-card-item.hub-card-item--summary:not(.hub-card-item--more):visible")
    ).toHaveCount(1);
  });

  test("Open controls hydrates a summary row and navigates to /created/", async ({ page }) => {
    const entries = makeLargeWalletEntries();
    const target = entries[entries.length - 1];

    await gotoHome(page);
    await openExpandedHub(page);
    await page.getByRole("button", { name: /Show \d+ more/i }).click();

    await page
      .locator("#device-hub-wallet-list .hub-card-item")
      .filter({ hasText: LAST_ROW_LABEL })
      .getByRole("button", { name: "Open controls", exact: true })
      .click();

    await expect(page).toHaveURL(new RegExp(`/created/\\?.*profile_id=${target.profile_id}`));
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain(BASE_ENTRY.owner_private_key_b58);
  });
});

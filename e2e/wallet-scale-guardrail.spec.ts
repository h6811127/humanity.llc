import { test, expect, type Page } from "@playwright/test";

/**
 * Large-wallet soft guardrails (P2 sad-path backlog).
 * @see docs/SAD_PATH_COVERAGE_AND_BACKLOG.md § Large wallet
 * @see site/js/device-wallet-scale-core.mjs
 */

const BASE_ENTRY = {
  saved_at: "2026-05-25T12:00:00.000Z",
  handle: "e2etest",
  manifesto_line: "Test line",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

function makeWalletEntries(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const suffix = String(i).padStart(2, "0");
    const profileId = `7Xk9mP2nQ4rT6vW8yZ1aB${suffix}`;
    const qrId = `qr_E2eWalletScale${suffix}`;
    return {
      ...BASE_ENTRY,
      id: `e2e_scale_${suffix}`,
      label: `Scale Card ${i + 1}`,
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
          qr_id: "qr_E2eWalletScale00",
          card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
          verification: { state: "registered", label: "Registered" },
          human_trust: { label: "Registered", subtitle: "", pill_active: false },
        },
      }),
    })
  );
}

async function seedWallet(page: Page, count: number) {
  const entries = makeWalletEntries(count);
  await page.addInitScript((walletEntries) => {
    localStorage.setItem("hc_wallet", JSON.stringify(walletEntries));
    localStorage.removeItem("hc_wallet_summary");
    localStorage.setItem("hc_device_hub_intro_dismissed", "1");
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
  }, entries);
}

test.describe("wallet scale guardrails (P2)", () => {
  test.beforeEach(async ({ page }) => {
    await stubResolverRoutes(page);
  });

  test("W1: /wallet/ shows comfortable hint at 7 saved cards", async ({ page }) => {
    await seedWallet(page, 7);
    await page.goto("/wallet/");

    await expect(page.locator("#device-hub-large-wallet-hint")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#device-hub-large-wallet-hint")).toContainText(/1–5/);
    await expect(page.locator("#device-hub-large-wallet-hint")).toContainText(/7 saved/);
  });

  test("W2: /wallet/ shows large-wallet hint at 12 saved cards", async ({ page }) => {
    await seedWallet(page, 12);
    await page.goto("/wallet/");

    await expect(page.locator("#device-hub-large-wallet-hint")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#device-hub-large-wallet-hint")).toContainText(/Large wallet/i);
    await expect(page.locator("#device-hub-large-wallet-hint")).toContainText(/12 saved/i);
  });

  test("W3: expanded hub custody panel shows scale row at 8 saved cards", async ({ page }) => {
    await seedWallet(page, 8);
    await page.goto("/");
    await expect(page.locator("#brand-status-dot")).toHaveAttribute("data-dot-state", /.+/, {
      timeout: 15_000,
    });

    await page.locator("#brand-status-dot-btn").click();
    await expect(page.locator("body")).toHaveClass(/device-hub-sheet-open/);

    await expect(page.locator(".device-hub-keys-custody-row--wallet_scale")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".device-hub-keys-custody-row--wallet_scale")).toContainText(
      /Many saved cards/i
    );
    await expect(page.locator(".device-hub-keys-custody-row--wallet_scale")).toContainText(/1–5/);
  });
});

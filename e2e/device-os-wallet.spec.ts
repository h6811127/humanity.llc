import { test, expect } from "@playwright/test";

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_test_1",
  label: "E2E Test Card",
  saved_at: "2026-05-25T12:00:00.000Z",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  qr_id: "qr_e2e_test_001",
  handle: "e2etest",
  manifesto_line: "Test line",
  scan_url:
    "http://127.0.0.1:8787/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_e2e_test_001",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  status: "active",
};

test.describe("device OS wallet flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SAMPLE_WALLET_ENTRY);
  });

  test("shows saved card and Control card opens /created/ with session keys", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await page.getByRole("button", { name: "Control card" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
  });
});

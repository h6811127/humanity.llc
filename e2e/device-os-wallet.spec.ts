import { test, expect } from "@playwright/test";

const SAMPLE_WALLET_ENTRY = {
  id: "e2e_test_1",
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

test.describe("device OS wallet flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((entry) => {
      localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    }, SAMPLE_WALLET_ENTRY);
  });

  test("shows My cards home and Open controls opens /created/ with session keys", async ({
    page,
  }) => {
    await page.goto("/wallet/");
    await expect(page.getByRole("heading", { name: "My cards on this device" })).toBeVisible();
    await expect(page.getByText("E2E Test Card")).toBeVisible();
    await page.getByRole("button", { name: "Open controls" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
  });

  test("Update status opens /created/ with keys and update panel focus", async ({ page }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem("hc_setup_done", JSON.stringify({ [profileId]: true }));
    }, SAMPLE_WALLET_ENTRY.profile_id);
    await page.goto("/wallet/");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page).toHaveURL(/\/created\/\?.*profile_id=7Xk9mP2nQ4rT6vW8yZ1aB3cD5/);
    await expect(page).toHaveURL(/#update-status/);
    const sessionRaw = await page.evaluate(() => sessionStorage.getItem("hc_created"));
    expect(sessionRaw).toContain("privkeyfortestonlyxxxxxxxxx");
    await expect(page.locator("#created-tab-advanced")).toBeVisible();
  });

  test("does not show card-disabled-since-visit banner when resolver reports active", async ({
    page,
  }) => {
    await page.addInitScript((profileId) => {
      localStorage.setItem(
        "hc_wallet_last_seen_network",
        JSON.stringify({ [profileId]: "active" })
      );
      sessionStorage.removeItem("hc_wallet_network_cache");
    }, SAMPLE_WALLET_ENTRY.profile_id);

    await page.route("**/.well-known/hc/v1/cards/**/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.0",
          resolver: { operator: "humanity.llc", version: "1.0" },
          scan: {
            kind: "active",
            profile_id: SAMPLE_WALLET_ENTRY.profile_id,
            qr_id: SAMPLE_WALLET_ENTRY.qr_id,
            card: { status: "active", handle: "e2etest", manifesto_line: "Test line" },
            verification: { state: "registered", label: "Registered" },
            human_trust: { label: "Registered", subtitle: "", pill_active: false },
          },
        }),
      });
    });

    await page.goto("/wallet/");
    await expect(page.getByText("Live State Active")).toBeVisible();
    await expect(
      page.getByText("Card disabled on the network since your last visit.")
    ).toBeHidden();
  });

  test("contextless /created/ redirects to My cards home", async ({ page }) => {
    await page.goto("/created/");
    await expect(page).toHaveURL(/\/wallet\/$/);
    await expect(page.getByRole("heading", { name: "My cards on this device" })).toBeVisible();
  });
});

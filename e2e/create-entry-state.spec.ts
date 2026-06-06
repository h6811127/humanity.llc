import { test, expect, type Page } from "@playwright/test";

/**
 * Create flow Step 20 slice 5 — entry gate at room entry (not mid-form redirect).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Five steward entry states
 */

const GENERAL_ROOT = {
  id: "e2e_entry_state_root",
  label: "River studio",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "profE2eEntryState01",
  qr_id: "qr_e2e_entry_state_01",
  handle: "river_studio",
  manifesto_line: "General root for entry state",
  pilot_template: "general",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "http://127.0.0.1:8788/c/profE2eEntryState01?q=qr_e2e_entry_state_01",
  status: "active",
};

async function stubCreateShellHealth(page: Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function seedGeneralRootWallet(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
  }, GENERAL_ROOT);
}

async function seedGeneralRootWithSession(page: Page) {
  await page.addInitScript((entry) => {
    localStorage.setItem("hc_wallet", JSON.stringify([entry]));
    localStorage.setItem("hc_keys_custody_notice_dismissed", "1");
    sessionStorage.setItem(
      "hc_created",
      JSON.stringify({
        profile_id: entry.profile_id,
        qr_id: entry.qr_id,
        handle: entry.handle,
        owner_public_key_b58: entry.owner_public_key_b58,
        owner_private_key_b58: entry.owner_private_key_b58,
        pilot_template: "general",
      })
    );
  }, GENERAL_ROOT);
}

test.describe("create entry state gate (slice 5)", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("state 1 new_device shows deploy form without gate", async ({ page }) => {
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-entry-gate")).toBeHidden();
    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-form-main-fields")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Create sign & QR");
  });

  test("state 3 returning_wallet shows unlock gate instead of mid-form redirect", async ({
    page,
  }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-entry-gate-title")).toContainText("@river_studio");
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
    await expect(page.locator("#submit")).toBeHidden();
    await expect(page.locator("#deploy-object-label")).toBeHidden();
  });

  test("state 2 returning_session shows continue gate with keys in tab", async ({ page }) => {
    await seedGeneralRootWithSession(page);
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-entry-gate-title")).toContainText("ready on this tab");
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
    await expect(page.locator("#submit")).toBeHidden();
  });

  test("wear intent with saved root shows gate not redirect submit label", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=wear");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
    await expect(page.locator("#submit")).toBeHidden();
  });

  test("secondary bypass reveals create form for new @handle", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await page.locator("#create-entry-gate-secondary").click();

    await expect(page.locator("#create-entry-gate")).toBeHidden();
    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-form-main-fields")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Create sign & QR");
  });

  test("field-kit template with saved root shows gate at entry", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?template=status_plate");

    await expect(page.locator("#create-entry-gate")).toBeVisible();
    await expect(page.locator("#create-form-main-fields")).toBeHidden();
  });
});

import { test, expect, type Page } from "@playwright/test";

/**
 * Create flow convergence (ROOT_CARD step 14) + Phase 1 topology convergence.
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Implementation sequence step 14
 */

const GENERAL_ROOT = {
  id: "e2e_conv_root",
  label: "River studio",
  saved_at: "2026-05-29T12:00:00.000Z",
  profile_id: "profE2eConvRoot01",
  qr_id: "qr_e2e_conv_root_01",
  handle: "river_studio",
  manifesto_line: "General root for convergence",
  pilot_template: "general",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  scan_url: "http://127.0.0.1:8788/c/profE2eConvRoot01?q=qr_e2e_conv_root_01",
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

test.describe("create entry chooser (step 11)", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("bare /create/ shows steward chooser before the form (no play door)", async ({ page }) => {
    await page.goto("/create/");

    await expect(page.locator("#create-entry-chooser")).toBeVisible();
    await expect(page.locator("#create-form-panel")).toBeHidden();
    await expect(page.getByText("Your @handle")).toBeVisible();
    await expect(page.getByText("Live status on something")).toBeVisible();
    await expect(page.getByText("Live status on you")).toBeVisible();
    await expect(page.getByText("Play the city game")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Cedar Rapids city board/i })).toBeVisible();
  });

  test("organize a live season link opens season account fork", async ({ page }) => {
    await page.goto("/create/");

    await page.getByRole("link", { name: /Organize a live season/i }).click();

    await expect(page).toHaveURL(/intent=game/);
    await expect(page.locator("#create-game-season-fork")).toBeVisible();
    await expect(page.locator("#create-game-season-wizard")).toBeHidden();
    await expect(page.locator("#create-hero-title")).toHaveText("Organize a live season");
  });

  test("season fork dedicated path shows season id field", async ({ page }) => {
    await page.goto("/create/?intent=game&season_account=dedicated");

    await expect(page.locator("#create-game-season-fork")).toBeHidden();
    await expect(page.locator("#create-game-season-wizard")).toBeVisible();
    await expect(page.locator("#game-season-id-block")).toBeVisible();
    await expect(page.locator("#enable-organizer-revoke")).toBeChecked();
    await expect(page.locator("#submit")).toHaveText(/season @handle/i);
  });

  test("season fork existing path continues on saved deploy root", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=game&season_account=existing");

    await expect(page.locator("#game-season-id-block")).toBeHidden();
    await expect(page.locator("#submit")).toHaveText(/Open @river_studio to set up season/i);
  });

  test("wear BYOP link opens form with intent=wear", async ({ page }) => {
    await page.goto("/create/?intent=wear");

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page).toHaveURL(/intent=wear/);
    await expect(page.locator("#create-wear-wizard")).toBeVisible();
    await expect(page.locator("#create-hero-title")).toHaveText("Print your own QR wear");
  });

  test("general account door opens form with intent=general", async ({ page }) => {
    await page.goto("/create/");

    await page.locator('[data-create-door="account"]').click();

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page.locator("#create-entry-chooser")).toBeHidden();
    await expect(page).toHaveURL(/intent=general/);
    await expect(page.locator("#create-hero-title")).toHaveText("Create your account");
    await expect(page.locator("#manifesto")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Create and get QR");
  });

  test("deploy door opens form with intent=deploy", async ({ page }) => {
    await page.goto("/create/");

    await page.locator('[data-create-door="something"]').click();

    await expect(page.locator("#create-form-panel")).toBeVisible();
    await expect(page.locator("#create-entry-chooser")).toBeHidden();
    await expect(page).toHaveURL(/intent=deploy/);
    await expect(page.locator("#create-hero-title")).toHaveText("Make a QR sign");
    await expect(page.locator("#create-hero-lead")).not.toContainText("legacy pilots");
    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-game-season-wizard")).toBeHidden();
  });

  test("deploy room redirects to Live when general root exists", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?intent=deploy");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Open @river_studio to add sign");
  });
});

test.describe("topology convergence — field-kit deep links", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("template=status_plate opens deploy wizard (tree path), not flat pilot UI", async ({
    page,
  }) => {
    await page.goto("/create/?template=status_plate");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#create-flat-pilot-compat")).toHaveCount(0);
    await expect(page.locator("#create-add-object-nudge")).toHaveCount(0);
    await expect(page.locator("#create-template-advanced")).toHaveCount(0);
  });

  test("template=lost_item opens deploy wizard for return tag", async ({ page }) => {
    await page.goto("/create/?template=lost_item");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#deploy-object-label-title")).toHaveText("What is this tag on?");
  });

  test("template deep link with saved root offers Live redirect", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/?template=status_plate");

    await expect(page.locator("#create-deploy-wizard")).toBeVisible();
    await expect(page.locator("#submit")).toHaveText("Open @river_studio to add sign");
  });
});

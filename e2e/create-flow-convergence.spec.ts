import { test, expect, type Page } from "@playwright/test";

/**
 * Create flow convergence nudge (ROOT_CARD step 14).
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Implementation sequence step 14
 * @see docs/HC_EMPHASIS_CARD_ROLLOUT.md
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

test.describe("create flow convergence nudge", () => {
  test.beforeEach(async ({ page }) => {
    await stubCreateShellHealth(page);
  });

  test("status plate shows labeled emphasis nudge with matching CTAs when general root exists", async ({
    page,
  }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/");

    await page.getByRole("button", { name: "Status plate" }).click();

    const nudge = page.locator("#create-add-object-nudge");
    await expect(nudge).toBeVisible();
    await expect(page.locator("#create-add-object-nudge-eyebrow")).toHaveText("Recommended path");
    await expect(page.locator("#create-add-object-nudge-title")).toContainText("existing card");

    const primary = page.locator("#create-add-object-nudge-primary");
    await expect(primary).toHaveText("Add status plate on Live");
    await expect(primary).toHaveClass(/hc-emphasis-card__cta/);
    await expect(primary).not.toHaveClass(/hc-emphasis-card__cta--secondary/);
    await expect(primary).toHaveAttribute(
      "href",
      /\/created\/\?profile_id=profE2eConvRoot01.*#add-status-plate/
    );

    const secondary = page.locator("#create-add-object-nudge-general");
    await expect(secondary).toHaveText("Create general card instead");
    await expect(secondary).toHaveClass(/hc-emphasis-card__cta--secondary/);
  });

  test("Use general card switches back to general template", async ({ page }) => {
    await seedGeneralRootWallet(page);
    await page.goto("/create/");

    await page.getByRole("button", { name: "Lost item" }).click();
    await expect(page.locator("#create-add-object-nudge")).toBeVisible();

    await page.locator("#create-add-object-nudge-general").click();

    await expect(page.locator("#create-add-object-nudge")).toBeHidden();
    await expect(page.locator('.create-template-btn[data-template="general"]')).toHaveClass(
      /is-active/
    );
    await expect(page.locator("#create-template-hint")).toBeVisible();
  });

  test("no general root: Switch to general card primary uses role=button", async ({ page }) => {
    await page.goto("/create/?template=status_plate");

    const nudge = page.locator("#create-add-object-nudge");
    await expect(nudge).toBeVisible();
    await expect(page.locator("#create-add-object-nudge-title")).toContainText(
      "general live card"
    );

    const primary = page.locator("#create-add-object-nudge-primary");
    await expect(primary).toHaveText("Switch to general card");
    await expect(primary).toHaveAttribute("role", "button");

    await primary.click();
    await expect(nudge).toBeHidden();
    await expect(page.locator('.create-template-btn[data-template="general"]')).toHaveClass(
      /is-active/
    );
  });
});

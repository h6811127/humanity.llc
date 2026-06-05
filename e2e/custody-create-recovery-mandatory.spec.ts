import { test, expect, type Route } from "@playwright/test";

/**
 * device_unlock create requires recovery method (G-C2 · K13).
 * @see docs/CUSTODY_RECOVERY_MANDATORY_QA.md
 *
 * CI: npm run e2e:custody-create-recovery
 */

async function wireShellHealth(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );
}

async function openCreateFormPanel(page: import("@playwright/test").Page) {
  await page.goto("/create/?intent=general", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#create-form-panel")).toBeVisible({ timeout: 15_000 });
}

test.describe("create recovery mandatory for device_unlock (G-C2 · K13)", () => {
  test("locks recovery checkbox when This device is selected", async ({ page }) => {
    await wireShellHealth(page);
    await openCreateFormPanel(page);

    const deviceRadio = page.locator('input[name="custody_mode"][value="device_unlock"]');
    const recoveryCb = page.locator("#generate-recovery");

    await expect(deviceRadio).toBeChecked({ timeout: 15_000 });
    await expect(recoveryCb).toBeChecked();
    await expect(recoveryCb).toBeDisabled();
    await expect(page.locator("#create-recovery-label")).toContainText(/required/i);
    await expect(page.locator("#create-recovery-hint")).toContainText(
      /not stored by humanity/i
    );
  });

  test("allows optional recovery when full control keys selected", async ({ page }) => {
    await wireShellHealth(page);
    await openCreateFormPanel(page);

    await page.locator('input[name="custody_mode"][value="full_keys"]').check();

    const fullRadio = page.locator('input[name="custody_mode"][value="full_keys"]');
    await expect(fullRadio).toBeChecked({ timeout: 15_000 });
    await expect(page.locator("#create-recovery-hint")).toContainText(/Recommended for show-keys/i);

    const recoveryCb = page.locator("#generate-recovery");
    await expect(recoveryCb).toBeEnabled();
    await recoveryCb.uncheck();
    await expect(recoveryCb).not.toBeChecked();
  });
});

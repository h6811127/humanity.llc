import { test, expect, type Route } from "@playwright/test";

/**
 * Organizer revoke shows explicit Face ID callout on Device control (Solution A).
 * @see docs/CUSTODY_WEBAUTHN_FALLBACK_QA.md row 5
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

test.describe("create custody organizer Face ID callout", () => {
  test("shows callout when organizer revoke is enabled", async ({ page }) => {
    await wireShellHealth(page);
    await openCreateFormPanel(page);

    const callout = page.locator("#create-custody-organizer-callout");
    await expect(callout).toBeHidden({ timeout: 15_000 });

    await page.locator("#create-organizer-details summary").click();
    await page.locator("#enable-organizer-revoke").check();

    await expect(callout).toBeVisible();
    await expect(page.locator("#create-custody-organizer-callout-title")).toContainText(
      /Organizer turn-off uses show-keys mode/i
    );
    await expect(page.locator('input[name="custody_mode"][value="device_unlock"]')).toBeDisabled();

    await page.locator("#enable-organizer-revoke").uncheck();
    await expect(callout).toBeHidden();
    await expect(
      page.locator('input[name="custody_mode"][value="device_unlock"]')
    ).toBeEnabled();
  });

  test("callout action opens organizer setting", async ({ page }) => {
    await wireShellHealth(page);
    await openCreateFormPanel(page);

    await page.locator("#create-organizer-details summary").click();
    await page.locator("#enable-organizer-revoke").check();
    await page.locator("#create-custody-organizer-callout-action").click();

    await expect(page.locator("#create-organizer-details")).toHaveAttribute("open", "");
    await expect(page.locator("#enable-organizer-revoke")).toBeFocused();
  });
});

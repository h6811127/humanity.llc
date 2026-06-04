import { expect, test } from "@playwright/test";

/**
 * E2E lock for shipped landing hero + three launch doors.
 * @see site/js/landing-copy-contract.mjs
 */
test.describe("landing copy contract", () => {
  test("hero and three ways in are visible on /", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /The sticker stays/i })
    ).toBeVisible();
    await expect(page.getByText("The status changes.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Three ways in" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Live status on something/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Live status on you/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Play the city game/i })).toBeVisible();
    await expect(page.getByText("Live state on real objects")).toHaveCount(0);
  });

  test("launch door opens status plate create", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Live status on something/i }).click();
    await expect(page).toHaveURL(/\/create\/\?intent=deploy/);
  });
});

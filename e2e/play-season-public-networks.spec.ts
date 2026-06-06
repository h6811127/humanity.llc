import { expect, test } from "@playwright/test";

test.describe("Find public networks (/play/season/)", () => {
  test("shows search, filters, and Cedar Rapids card", async ({ page }) => {
    await page.goto("/play/season/");
    await expect(page.getByRole("heading", { level: 1, name: "Find public networks" })).toBeVisible();
    await expect(page.getByLabel("Search public networks")).toBeVisible();
    await expect(page.getByRole("button", { name: /City games/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wake the city" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open board" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/map/"
    );
  });

  test("search filters listed networks", async ({ page }) => {
    await page.goto("/play/season/");
    await expect(page.getByRole("heading", { name: "Wake the city" })).toBeVisible();
    await page.getByLabel("Search public networks").fill("denver");
    await expect(page.getByRole("heading", { name: "Wake the city" })).toHaveCount(0);
    await expect(page.getByText(/No public networks match that search/i)).toBeVisible();
  });

  test("Open board reaches Cedar Rapids city board", async ({ page }) => {
    await page.goto("/play/season/");
    await page.getByRole("link", { name: "Open board" }).click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);
  });
});

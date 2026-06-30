import { expect, test } from "@playwright/test";

test.describe("Find public networks (/play/season/)", () => {
  test("shows search, filters, and Cedar Rapids card", async ({ page }) => {
    await page.goto("/play/season/");
    await expect(page.locator(".player-flow-breadcrumb")).toContainText("Public networks");
    await expect(page.getByRole("heading", { level: 1, name: "Find public networks" })).toBeVisible();
    await expect(page.getByLabel("Search public networks")).toBeVisible();
    await expect(page.locator(".public-networks-filter-btn", { hasText: "City games" })).toBeVisible();
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

  test("card links what a scan proves to rules charter anchor", async ({ page }) => {
    await page.goto("/play/season/");
    const results = page.locator("#public-networks-results");
    await expect(results.getByRole("link", { name: "What a scan proves" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/#rules-prove-title",
      { timeout: 15_000 }
    );
  });

  test("what a scan proves opens rules charter section", async ({ page }) => {
    await page.goto("/play/season/");
    await page
      .locator("#public-networks-results")
      .getByRole("link", { name: "What a scan proves" })
      .click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/#rules-prove-title/);
    await expect(page.getByRole("heading", { name: "What a scan proves" })).toBeVisible();
  });

  test("home dashboard link returns to landing discovery", async ({ page }) => {
    await page.goto("/play/season/");
    await page.getByRole("link", { name: "Home dashboard" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", {
        name: /Check what's true right now before you knock, pick up, or show up/i,
      })
    ).toBeVisible();
  });

  test("catalog to rules to board round trip", async ({ page }) => {
    await page.goto("/play/season/");
    await page
      .locator("#public-networks-results")
      .getByRole("link", { name: "What a scan proves" })
      .click();
    await expect(page.getByRole("heading", { name: "What a scan proves" })).toBeVisible();
    await page.getByRole("link", { name: "Open public state board" }).click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);
  });

  test("live card links browse places near me to discovery region", async ({ page }) => {
    await page.goto("/play/season/");
    await expect(
      page.locator("#public-networks-results").getByRole("link", { name: "Browse places near me" })
    ).toHaveAttribute("href", "/discover/cedar-rapids-iowa/", { timeout: 15_000 });
  });
});

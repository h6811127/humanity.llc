import { expect, test } from "@playwright/test";

test.describe("discovery region browse", () => {
  test("discover hub lists cedar rapids region", async ({ page }) => {
    await page.goto("/discover/");
    await expect(page.locator("h1")).toHaveText("Browse live places");
    await expect(page.locator(".discovery-region-card").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(".discovery-region-card__link")).toContainText(
      "Wake the city"
    );
  });

  test("cedar rapids browse lists pins with privacy copy", async ({ page }) => {
    await page.goto("/discover/cedar-rapids-iowa/");
    await expect(page.locator("h1")).toHaveText("Browse live places");
    await expect(page.locator("#discovery-near-me-privacy")).toContainText(
      "Location is used on your device"
    );
    await expect(page.locator("#discovery-near-me-btn")).toBeVisible();
    await expect(page.locator(".discovery-pin-row").first()).toBeVisible({
      timeout: 15000,
    });
    const count = await page.locator(".discovery-pin-row").count();
    expect(count).toBe(41);
    await expect(page.locator(".discovery-pin-row__state").first()).toBeVisible();
  });

  test("browse row opens pin detail via query param without rewrite", async ({ page }) => {
    await page.goto("/discover/cedar-rapids-iowa/");
    await expect(page.locator(".discovery-pin-row").first()).toBeVisible({
      timeout: 15000,
    });
    await page
      .locator(".discovery-pin-row a")
      .filter({ hasText: "Riverwalk River Lantern" })
      .click();
    await expect(page).toHaveURL(/pin=pin_cedar-rapids-iowa_node_04/);
    await expect(page.locator(".discovery-pin-detail h1")).toContainText(
      "Riverwalk River Lantern"
    );
    await expect(page.locator(".discovery-pin-detail__cta")).toContainText(
      "Open live scan"
    );
  });

  test("network filter narrows browse list to wake season pins", async ({ page }) => {
    await page.goto("/discover/cedar-rapids-iowa/?network=cr_season_01_wake");
    await expect(page.locator(".discovery-pin-row").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("#discovery-network-filter")).toContainText("Wake the city");
    await expect(page.locator("#discovery-network-board-link a")).toHaveAttribute(
      "href",
      "/play/cedar-rapids/map/"
    );
    const count = await page.locator(".discovery-pin-row").count();
    expect(count).toBe(40);
  });

  test("share path pin detail route shows live scan cta", async ({ page }) => {
    await page.goto(
      "/discover/cedar-rapids-iowa/pin/pin_cedar-rapids-iowa_node_04/"
    );
    await expect(page.locator(".discovery-pin-detail h1")).toContainText(
      "Riverwalk River Lantern",
      { timeout: 15000 }
    );
    await expect(page.locator(".discovery-pin-detail__cta")).toContainText(
      "Open live scan"
    );
  });

  test("cedar rapids browse footnote round-trips to board and catalog", async ({ page }) => {
    await page.goto("/discover/cedar-rapids-iowa/");
    const footnote = page.locator(".discovery-region-player-footnote");
    await expect(footnote.getByRole("link", { name: "Open board" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/map/"
    );
    await expect(footnote.getByRole("link", { name: "What a scan proves" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/#rules-prove-title"
    );
    await expect(footnote.getByRole("link", { name: "All public networks" })).toHaveAttribute(
      "href",
      "/play/season/"
    );
  });

  test("discover hub card uses browse places near me label", async ({ page }) => {
    await page.goto("/discover/");
    await expect(page.getByRole("link", { name: "Browse places near me" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

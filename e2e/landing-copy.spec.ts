import { expect, test } from "@playwright/test";

/**
 * E2E lock for shipped landing human-first discovery dashboard.
 * @see site/js/landing-copy-contract.mjs
 */
test.describe("landing copy contract", () => {
  test("human hero, entry shelves, boards, and create CTA are visible on /", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Check what's true right now before you knock, pick up, or show up/i,
      })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browse by need" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Open or paused" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Return, relay, hours" })).toBeVisible();
    await expect(page.getByLabel("Search live places and boards")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Public live boards" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Live object carriers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customize Glitch hoodie" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See all carriers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start with one live object" })).toBeVisible();
    const hero = page.locator(".landing-discovery-hero");
    await expect(hero.getByText("No account", { exact: true })).toBeVisible();
    await expect(hero.getByText("No scan surveillance", { exact: true })).toBeVisible();
    await expect(page.getByText("Live state on real objects")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Find public networks" })).toHaveCount(0);
  });

  test("carriers row hydrates shop-config price subtitle", async ({ page }) => {
    await page.goto("/");
    const sub = page.locator(".landing-carriers-feature-sub");
    await expect(sub).toContainText("$98 + shipping", { timeout: 10_000 });
  });

  test("carriers row links to shop customize", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Customize Glitch hoodie" }).click();
    await expect(page).toHaveURL(/\/shop\/customize\/\?product=glitch_hoodie_v1/);
  });

  test("see all carriers opens shop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See all carriers" }).click();
    await expect(page).toHaveURL(/\/shop\/?$/);
  });

  test("create CTA opens create flow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start with one live object" }).click();
    await expect(page).toHaveURL(/\/create\//);
  });

  test("loads Cedar Rapids board card with open board link", async ({ page }) => {
    await page.goto("/");
    const results = page.locator("#public-networks-results");
    await expect(results.getByRole("link", { name: "Open board" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(results.getByText("Wake the city")).toBeVisible();
  });

  test("lists catalog link and what a scan proves on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "See all listed public networks" })).toHaveAttribute(
      "href",
      "/play/season/"
    );
    await expect(page.getByRole("link", { name: "What a scan proves" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/#rules-prove-title"
    );
  });

  test("open board from homepage reaches Cedar Rapids map", async ({ page }) => {
    await page.goto("/");
    const openBoard = page.locator("#public-networks-results").getByRole("link", {
      name: "Open board",
    });
    await expect(openBoard).toBeVisible({ timeout: 15_000 });
    await openBoard.click();
    await expect(page).toHaveURL(/\/play\/cedar-rapids\/map\//);
    await expect(page.locator(".player-flow-breadcrumb")).toContainText("Wake the city board");
    await expect(page.getByRole("link", { name: "How this network works" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All public networks" })).toHaveAttribute(
      "href",
      "/play/season/"
    );
  });

  test("discovery card links what a scan proves to rules charter", async ({ page }) => {
    await page.goto("/");
    const results = page.locator("#public-networks-results");
    await expect(results.getByRole("link", { name: "What a scan proves" })).toHaveAttribute(
      "href",
      "/play/cedar-rapids/#rules-prove-title",
      { timeout: 15_000 }
    );
  });
});

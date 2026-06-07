import { expect, test } from "@playwright/test";

/**
 * E2E lock for shipped landing hero + three launch doors.
 * @see site/js/landing-copy-contract.mjs
 */
test.describe("landing copy contract", () => {
  test("vision hero, live object proof, primitive sticker line, and start-here doors are visible on /", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /An internet for physical places and objects/i,
      })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Try a live object" })).toBeVisible();
    const proof = page.locator("#landing-try-live-object");
    await expect(proof.getByRole("link", { name: /Studio door/i })).toBeVisible();
    await expect(proof.getByRole("link", { name: /Lost item relay/i })).toBeVisible();
    await expect(proof.getByRole("link", { name: /Tool library/i })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /The sticker stays\. The status changes\./i,
      })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start here" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore a live place/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add an object to the network/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Wear a live object/i })).toBeVisible();
    await expect(page.getByText("Live state on real objects")).toHaveCount(0);
  });

  test("launch door opens deploy create", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Add an object to the network/i }).click();
    await expect(page).toHaveURL(/\/create\/\?intent=deploy/);
  });
});

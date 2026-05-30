import { test, expect } from "@playwright/test";

/**
 * Shop product detail — Pages splat must not redirect-loop (Glitch drop and peers).
 * @see docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 1
 */

const GLITCH_PRODUCT_ID = "tier0_glitch_hoodie_v1";

const GLITCH_PRODUCT = {
  product_id: GLITCH_PRODUCT_ID,
  title: "Glitch LIVE QR hoodie",
  meaning_line: "A live network on fabric — same scan on every unit, not your personal card.",
  story:
    "Founding company drop — fixed Glitch artwork with a shared campaign QR. Every unit points at one live destination stewards can update; strangers see honest limits when they scan. You are buying witness and wear, not control of the feed and not a vouch.",
  product_class: "limited_drop",
  personalization_indicator: "Company drop",
  requires_card: false,
  supports_personalization: false,
  price_display: "$88 + shipping",
  detail_path: `/shop/products/${GLITCH_PRODUCT_ID}/`,
  row_ids: ["row_founding"],
};

const E2E_SHOP_CONFIG = {
  version: 1,
  site_origin: "http://127.0.0.1:8788",
  tier0: {
    products: [
      {
        product_id: GLITCH_PRODUCT_ID,
        title: "Glitch LIVE QR hoodie",
        price_display: "$88 + shipping",
        checkout_url: "",
        checkout_open: false,
        shopify_variant_id: "",
        fulfillment: "shopify_inventory",
      },
    ],
  },
  personalize: { checkout_open: false, products: [] },
};

async function stubProductDetailApis(page: import("@playwright/test").Page) {
  await page.route("**/.well-known/hc/v1/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "ok" }),
    })
  );

  await page.route("**/v1/print/catalog**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: [] }),
    })
  );

  await page.route(`**/v1/store/products/${GLITCH_PRODUCT_ID}**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GLITCH_PRODUCT),
    })
  );
}

test.describe("shop product detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((config) => {
      window.__HC_E2E_SHOP_CONFIG__ = config;
    }, E2E_SHOP_CONFIG);
    await stubProductDetailApis(page);
  });

  test("Glitch drop URL loads without redirect loop", async ({ page }) => {
    const response = await page.goto(`/shop/products/${GLITCH_PRODUCT_ID}/`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain(GLITCH_PRODUCT_ID);
    expect(page.url()).not.toMatch(/\/shop\/products\/detail\/?$/);

    await expect(page.locator("#product-title")).toContainText("Glitch LIVE QR hoodie", {
      timeout: 15_000,
    });
    await expect(page.locator("#product-status")).toContainText(/coming soon/i);
    await expect(page.locator("#product-honesty-title")).toContainText("How the scan behaves");
    await expect(page.locator("#product-honesty-list .list-title").first()).toContainText("Live");
  });

  test("shop hub View Glitch drop link reaches product detail", async ({ page }) => {
    await page.goto("/shop/");
    await page.getByRole("link", { name: "View Glitch drop" }).click();
    await page.waitForURL(new RegExp(`/shop/products/${GLITCH_PRODUCT_ID}/`), {
      timeout: 10_000,
    });
    await expect(page.locator("#product-title")).toContainText("Glitch LIVE QR hoodie", {
      timeout: 10_000,
    });
  });
});

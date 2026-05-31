import { test, expect } from "@playwright/test";

/**
 * Shop product detail — Pages splat must not redirect-loop (Glitch + peers).
 * @see docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 1
 * @see docs/MERCH_PRODUCT_COPY.md § Engineering rewire step 3
 */

const GLITCH_PRODUCT_ID = "glitch_hoodie_v1";
const LEGACY_GLITCH_PRODUCT_ID = "tier0_glitch_hoodie_v1";

const GLITCH_PRODUCT = {
  product_id: GLITCH_PRODUCT_ID,
  title: "Glitch LIVE QR hoodie",
  meaning_line: "Founding Glitch art on your chest — your unique QR, your live line.",
  story:
    "Fixed Glitch garment design with a unique revocable QR tied to your Humanity Card. Change what strangers read from your phone without reprinting. Commerce does not verify you or grant a vouch.",
  product_class: "personalized",
  personalization_indicator: "Personalized QR",
  requires_card: true,
  supports_personalization: true,
  price_display: "$98 + shipping",
  detail_path: `/shop/products/${GLITCH_PRODUCT_ID}/`,
  action_path: `/shop/customize/?product=${GLITCH_PRODUCT_ID}`,
  row_ids: ["row_personalize"],
};

const LEGACY_GLITCH_REDIRECT = {
  redirect: true,
  legacy_product_id: LEGACY_GLITCH_PRODUCT_ID,
  ...GLITCH_PRODUCT,
  redirect_to: `/shop/customize/?product=${GLITCH_PRODUCT_ID}`,
};

const E2E_SHOP_CONFIG = {
  version: 1,
  site_origin: "http://127.0.0.1:8788",
  tier0: { products: [] },
  personalize: {
    checkout_open: false,
    checkout_product_id: GLITCH_PRODUCT_ID,
    products: [
      {
        product_id: GLITCH_PRODUCT_ID,
        print_template_id: "hc-glitch-hoodie-v1",
        title: "Glitch LIVE QR hoodie",
        price_display: "$98 + shipping",
        checkout_url: "",
        shopify_variant_id: "",
      },
    ],
  },
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
      body: JSON.stringify({
        products: [
          {
            template_id: "hc-glitch-hoodie-v1",
            type: "hoodie",
            variants: [{ variant_id: "black-m", enabled: true }],
          },
        ],
      }),
    })
  );

  await page.route(`**/v1/store/products/${GLITCH_PRODUCT_ID}**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(GLITCH_PRODUCT),
    })
  );

  await page.route(`**/v1/store/products/${LEGACY_GLITCH_PRODUCT_ID}**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(LEGACY_GLITCH_REDIRECT),
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

  test("Glitch Tier 1 product URL loads without redirect loop", async ({ page }) => {
    const response = await page.goto(`/shop/products/${GLITCH_PRODUCT_ID}/`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain(GLITCH_PRODUCT_ID);
    expect(page.url()).not.toMatch(/\/shop\/products\/detail\/?$/);

    await expect(page.locator("#product-title")).toContainText("Glitch LIVE QR hoodie", {
      timeout: 15_000,
    });
    await expect(page.locator("#product-status")).toContainText(/preview live/i);
    await expect(page.locator("#product-honesty-title")).toContainText("Your pen, not the page");
    await expect(page.locator("#product-honesty-list .list-title").first()).toContainText("Live");
    await expect(page.locator("#product-action-btn")).toHaveAttribute(
      "href",
      `/shop/customize/?product=${GLITCH_PRODUCT_ID}`
    );
  });

  test("legacy shared-batch Glitch URL redirects to customizer", async ({ page }) => {
    await page.goto(`/shop/products/${LEGACY_GLITCH_PRODUCT_ID}/`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL(new RegExp(`/shop/customize/\\?product=${GLITCH_PRODUCT_ID}`), {
      timeout: 10_000,
    });
  });

  test("shop hub Customize Glitch hoodie link reaches customizer", async ({ page }) => {
    await page.goto("/shop/");
    await page.getByRole("link", { name: "Customize Glitch hoodie" }).click();
    await page.waitForURL(new RegExp(`/shop/customize/\\?product=${GLITCH_PRODUCT_ID}`), {
      timeout: 10_000,
    });
    await expect(page.locator("#shop-customize-hero-title")).toContainText("Glitch LIVE QR hoodie", {
      timeout: 10_000,
    });
  });
});

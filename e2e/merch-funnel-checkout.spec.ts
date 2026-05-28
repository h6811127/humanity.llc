import { test, expect } from "@playwright/test";

/**
 * Merch funnel — artifact intent checkout handoff (docs/MERCH_FUNNEL_MVP.md).
 * Isolated from create→customize flow so shop-config is stubbed before first fetch.
 */

/** Protocol-shaped ids (see qr-scan-url-lock.mjs) — short placeholders break QR preview. */
const E2E_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const E2E_CARD_QR = "qr_test_card_001";
const E2E_INTENT = "ai_e2eMerchCheckout1";
const E2E_PLANNED_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";

const OPEN_SHOP_CONFIG = {
  version: 1,
  site_origin: "http://127.0.0.1:8788",
  personalize: {
    checkout_open: true,
    products: [
      {
        product_id: "hoodie_live_object_v1",
        title: "Live Object hoodie",
        preview: "hoodie",
        price_display: "$48 + shipping",
        shopify_variant_id: "12345678901234",
        checkout_url: "https://store.example/cart/12345678901234:1",
      },
    ],
  },
};

const E2E_SESSION = {
  profile_id: E2E_PROFILE,
  qr_id: E2E_CARD_QR,
  handle: "e2e_merch_checkout",
  owner_private_key_b58: "e2e_stub_key",
  scan_url: `http://127.0.0.1:8787/c/${E2E_PROFILE}?q=${E2E_CARD_QR}`,
};

test.describe("merch funnel checkout handoff", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((payload) => {
      sessionStorage.clear();
      localStorage.clear();
      window.__HC_E2E_SHOP_CONFIG__ = payload.config;
      sessionStorage.setItem("hc_created", JSON.stringify(payload.session));
      const open = window.open.bind(window);
      window.open = (url, target, features) => {
        if (typeof url === "string" && url) {
          window.__HC_E2E_LAST_CHECKOUT_URL = url;
        }
        return open(url, target, features);
      };
    }, { config: OPEN_SHOP_CONFIG, session: E2E_SESSION });

    // Resolver API (8787) — glob **/v1/... does not match host:port URLs in Playwright.
    await page.route(/artifact-intents/, async (route) => {
      const url = route.request().url();
      if (route.request().method() !== "POST") {
        await route.fulfill({ status: 405 });
        return;
      }
      if (/\/attach$/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            artifact_intent_id: E2E_INTENT,
            planned_item_qr_ids: [E2E_PLANNED_QR],
            shopify: {
              cart_line_attributes: [
                { key: "artifact_intent_id", value: E2E_INTENT },
                { key: "profile_id", value: E2E_PROFILE },
              ],
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          artifact_intent_id: E2E_INTENT,
          planned_item_qr_ids: [E2E_PLANNED_QR],
          planned_print_artifact_ids: ["pa_e2e1"],
          preview_url: `https://humanity.llc/c/${E2E_PROFILE}?q=${E2E_PLANNED_QR}`,
        }),
      });
    });
  });

  test("opens Shopify cart with artifact_intent_id line property", async ({ page }) => {
    await page.goto("/shop/customize/?hc_ref=customize_shop");

    await expect(page.locator("#shop-customize-card-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#shop-customize-status")).toContainText(
      /Confirm the limits below/i,
      { timeout: 20_000 }
    );
    await expect(page.locator("#shop-customize-interest")).toBeHidden();

    await page.locator("#shop-customize-approve").check();
    await expect(page.locator("#shop-customize-checkout")).toBeEnabled();

    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.locator("#shop-customize-checkout").click(),
    ]);

    const checkoutHref = await page.evaluate(
      () => window.__HC_E2E_LAST_CHECKOUT_URL ?? ""
    );
    const checkoutUrl = new URL(checkoutHref);
    expect(checkoutUrl.searchParams.get("properties[artifact_intent_id]")).toBe(E2E_INTENT);
    await popup.close();
  });
});

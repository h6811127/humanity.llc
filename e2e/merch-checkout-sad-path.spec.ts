import { test, expect } from "@playwright/test";

/**
 * Merch checkout sad paths — customize gate and checkout-closed UX.
 * Complements merch-funnel-checkout.spec.ts (consent, recovery, happy handoff).
 * @see docs/MERCH_CHECKOUT_SAD_PATH_MATRIX.md M1–M2
 */

const E2E_PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const E2E_CARD_QR = "qr_test_card_001";

const PRINT_CATALOG = {
  products: [
    {
      template_id: "hc-hoodie-live-object-v1",
      type: "hoodie",
      title: "Live Object hoodie",
      description: "Unique QR per unit.",
      variants: [{ variant_id: "black-m", label: "Black / M", enabled: true }],
    },
    {
      template_id: "hc-sticker-square-v1",
      type: "sticker",
      title: "Humanity QR Sticker",
      description: "Square sticker.",
      variants: [{ variant_id: "2x2-white", enabled: true }],
    },
  ],
};

const E2E_SESSION = {
  profile_id: E2E_PROFILE,
  qr_id: E2E_CARD_QR,
  handle: "e2e_merch_sad",
  owner_public_key_b58: "pubkeyfortestonlyxxxxxxxxxxxx",
  owner_private_key_b58: "privkeyfortestonlyxxxxxxxxx",
  recovery_key_acknowledged: true,
  scan_url: `http://127.0.0.1:8787/c/${E2E_PROFILE}?q=${E2E_CARD_QR}`,
};

const CLOSED_SHOP_CONFIG = {
  version: 1,
  site_origin: "http://127.0.0.1:8788",
  personalize: {
    checkout_open: false,
    checkout_product_id: "sticker_personalized_v1",
    products: [
      {
        product_id: "hoodie_live_object_v1",
        title: "Live Object hoodie",
        preview: "hoodie",
        price_display: "$48 + shipping",
      },
      {
        product_id: "sticker_personalized_v1",
        title: "Personalized sticker",
        preview: "sticker",
        price_display: "$12 + shipping",
      },
    ],
  },
};

async function stubCustomizeApis(page: import("@playwright/test").Page) {
  await page.route("**/v1/print/catalog**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PRINT_CATALOG),
    })
  );

  await page.route(/artifact-intents/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ status: 405, body: "METHOD_NOT_ALLOWED" });
      return;
    }
    const body = route.request().postDataJSON() as {
      profile_id?: string;
      source_qr_id?: string;
      product_id?: string;
    };
    const profileId = body?.profile_id ?? E2E_PROFILE;
    const plannedQrId = "qr_planned_sad_path_item";
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        artifact_intent_id: "ai_e2eMerchSadPath1",
        profile_id: profileId,
        source_qr_id: body?.source_qr_id ?? E2E_CARD_QR,
        product_id: body?.product_id ?? "sticker_personalized_v1",
        planned_item_qr_ids: [plannedQrId],
        preview_url: `http://127.0.0.1:8787/c/${profileId}?q=${plannedQrId}`,
      }),
    });
  });
}

test.describe("merch checkout sad paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await stubCustomizeApis(page);
  });

  test("M1: no card session shows create gate, not checkout", async ({ page }) => {
    await page.goto("/shop/customize/?hc_ref=customize_shop");

    await expect(page.locator("#shop-customize-card-gate")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("#shop-customize-card-ready")).toBeHidden();
    await expect(page.locator("#shop-customize-create-link")).toBeVisible();
    await expect(page.locator("#shop-customize-checkout")).toBeHidden();
  });

  test("M2: checkout closed shows interest block, hides checkout and shipping", async ({
    page,
  }) => {
    await page.addInitScript((payload) => {
      window.__HC_E2E_SHOP_CONFIG__ = payload.config;
      sessionStorage.setItem("hc_created", JSON.stringify(payload.session));
    }, { config: CLOSED_SHOP_CONFIG, session: E2E_SESSION });

    await page.goto("/shop/customize/?hc_ref=customize_shop");

    await expect(page.locator("#shop-customize-card-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("#shop-customize-card-gate")).toBeHidden();
    await expect(page.locator("#shop-customize-interest")).toBeVisible();
    await expect(page.locator("#shop-customize-interest-title")).toContainText(
      /Checkout opening soon/i
    );
    await expect(page.locator("#shop-customize-checkout")).toBeHidden();
    await expect(page.locator("#shop-customize-shipping-form")).toBeHidden();
  });
});

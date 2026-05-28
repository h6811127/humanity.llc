import { describe, expect, it } from "vitest";

import {
  enrichProductDetail,
  productDetailActionEnabled,
  productDetailActionLabel,
  productDetailPriceLabel,
  productDetailRowLabel,
  productDetailShowsPersistenceWarning,
  readProductIdFromPath,
  storeProductDetailPath,
} from "../../site/js/shop-product-detail-core.mjs";

const CONFIG = {
  tier0: {
    checkout_open: true,
    checkout_url: "https://store.example/cart/1:1",
    price_display: "$8 + shipping",
  },
  personalize: {
    checkout_open: true,
    checkout_product_id: "sticker_personalized_v1",
    products: [
      {
        product_id: "sticker_personalized_v1",
        print_template_id: "hc-sticker-square-v1",
        checkout_url: "https://store.example/cart/2:1",
        shopify_variant_id: "123",
        price_display: "$12 + shipping",
      },
    ],
  },
};

const CATALOG = {
  products: [
    {
      template_id: "hc-sticker-square-v1",
      type: "sticker",
      variants: [{ variant_id: "2x2-white", enabled: true }],
    },
  ],
};

describe("shop-product-detail-core", () => {
  it("reads product id from /shop/products/{id}/ path", () => {
    expect(readProductIdFromPath("/shop/products/sticker_personalized_v1/")).toBe(
      "sticker_personalized_v1"
    );
    expect(readProductIdFromPath("/shop/products/tier0_founding_sticker_v1")).toBe(
      "tier0_founding_sticker_v1"
    );
  });

  it("builds canonical detail paths", () => {
    expect(storeProductDetailPath("hoodie_live_object_v1")).toBe(
      "/shop/products/hoodie_live_object_v1/"
    );
  });

  it("enriches API product with availability and action path", () => {
    const enriched = enrichProductDetail(CONFIG, CATALOG, {
      product_id: "sticker_personalized_v1",
      product_class: "personalized",
      supports_personalization: true,
      requires_card: true,
      row_ids: ["row_personalize"],
      price_display: "$12 + shipping",
      detail_path: "/shop/products/sticker_personalized_v1/",
      action_path: "/shop/customize/?product=sticker_personalized_v1",
    });
    expect(enriched.availability).toBe("checkout");
    expect(enriched.action_path).toBe("/shop/customize/?product=sticker_personalized_v1");
    expect(productDetailActionLabel(enriched)).toBe("Customize and checkout");
    expect(productDetailActionEnabled(enriched)).toBe(true);
  });

  it("labels founding row and shows persistence warning for personalized products", () => {
    const founding = enrichProductDetail(CONFIG, CATALOG, {
      product_id: "tier0_founding_sticker_v1",
      product_class: "limited_drop",
      requires_card: false,
      supports_personalization: false,
      row_ids: ["row_founding"],
    });
    expect(productDetailRowLabel(founding)).toBe("Founding objects");
    expect(productDetailPriceLabel(founding)).toBe("$8 + shipping");
    expect(productDetailShowsPersistenceWarning(founding)).toBe(false);

    const sticker = enrichProductDetail(CONFIG, CATALOG, {
      product_id: "sticker_personalized_v1",
      product_class: "personalized",
      supports_personalization: true,
      requires_card: true,
      row_ids: ["row_personalize"],
      price_display: "$12 + shipping",
    });
    expect(productDetailRowLabel(sticker)).toBe("Make it yours");
    expect(productDetailShowsPersistenceWarning(sticker)).toBe(true);
  });
});

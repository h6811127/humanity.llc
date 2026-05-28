import { describe, expect, it } from "vitest";

import {
  isTier0StoreProductCheckoutOpen,
  tier0CatalogReadiness,
  tier0ProductCheckoutReadiness,
  tier0ProductById,
  tier0Products,
  tier0WorkerEnvVarForFulfillment,
} from "../../site/js/shop-tier0-core.mjs";

describe("shop-tier0-core", () => {
  it("reads tier0.products[] entries", () => {
    const config = {
      tier0: {
        products: [
          {
            product_id: "tier0_founding_sticker_v1",
            title: "Sticker",
            checkout_open: true,
            checkout_url: "https://store.example/cart/1:1",
          },
          {
            product_id: "tier0_glitch_hoodie_v1",
            title: "Glitch hoodie",
            checkout_open: false,
            checkout_url: "",
          },
        ],
      },
    };
    expect(tier0Products(config)).toHaveLength(2);
    expect(isTier0StoreProductCheckoutOpen(config, "tier0_founding_sticker_v1")).toBe(true);
    expect(isTier0StoreProductCheckoutOpen(config, "tier0_glitch_hoodie_v1")).toBe(false);
  });

  it("maps legacy tier0 block to founding sticker product", () => {
    const config = {
      tier0: {
        product_title: "Founding signal sticker",
        checkout_open: true,
        checkout_url: "https://store.example/cart/99:1",
        price_display: "$10 + shipping",
      },
    };
    const products = tier0Products(config);
    expect(products).toHaveLength(1);
    expect(products[0]?.product_id).toBe("tier0_founding_sticker_v1");
    expect(tier0ProductById(config, "tier0_founding_sticker_v1")?.price_display).toBe(
      "$10 + shipping"
    );
  });

  it("maps fulfillment mode to Worker env var names", () => {
    expect(
      tier0WorkerEnvVarForFulfillment({ fulfillment: "shopify_inventory" })
    ).toBe("TIER0_SHOPIFY_INVENTORY_VARIANT_IDS");
    expect(tier0WorkerEnvVarForFulfillment({ fulfillment: "printify_batch" })).toBe(
      "TIER0_SHOPIFY_VARIANT_IDS"
    );
  });

  it("reports checkout readiness for open Tier 0 products", () => {
    const product = {
      product_id: "tier0_glitch_hoodie_v1",
      checkout_open: true,
      checkout_url: "https://store.example/cart/555:1",
      shopify_variant_id: "555",
      fulfillment: "shopify_inventory",
    };
    expect(tier0ProductCheckoutReadiness(product).ready).toBe(true);
    expect(tier0ProductCheckoutReadiness(product).worker_env).toBe(
      "TIER0_SHOPIFY_INVENTORY_VARIANT_IDS"
    );

    const config = { tier0: { products: [product] } };
    expect(tier0CatalogReadiness(config).ready).toBe(true);
    expect(tier0CatalogReadiness(config, { product_id: "tier0_glitch_hoodie_v1" }).ready).toBe(
      true
    );
    expect(tier0CatalogReadiness({ tier0: { products: [] } }).ready).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  isTier0StoreProductCheckoutOpen,
  tier0ProductById,
  tier0Products,
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
});

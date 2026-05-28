import { describe, expect, it } from "vitest";

import {
  personalizeCatalogReadiness,
  personalizeProductIssues,
} from "../../site/js/shop-config-core.mjs";

describe("personalizeCatalogReadiness", () => {
  it("passes when checkout_open and products have cart URLs", () => {
    const { ready, issues } = personalizeCatalogReadiness({
      personalize: {
        checkout_open: true,
        products: [
          {
            product_id: "hoodie_live_object_v1",
            shopify_variant_id: "123",
            checkout_url: "https://store.example/cart/123:1",
          },
        ],
      },
    });
    expect(ready).toBe(true);
    expect(issues).toEqual([]);
  });

  it("lists gaps for current operator template", () => {
    const { ready, issues } = personalizeCatalogReadiness({
      personalize: {
        checkout_open: false,
        products: [
          {
            product_id: "hoodie_live_object_v1",
            shopify_variant_id: "",
            checkout_url: "",
          },
        ],
      },
    });
    expect(ready).toBe(false);
    expect(issues.some((i) => i.includes("checkout_open"))).toBe(true);
    expect(issues.some((i) => i.includes("checkout_url"))).toBe(true);
    expect(issues.some((i) => i.includes("shopify_variant_id"))).toBe(true);
  });

  it("flags non-cart Shopify URLs", () => {
    const issues = personalizeProductIssues(
      {
        product_id: "x",
        shopify_variant_id: "1",
        checkout_url: "https://store.example/products/foo",
      },
      0
    );
    expect(issues.some((i) => i.includes("/cart/"))).toBe(true);
  });
});

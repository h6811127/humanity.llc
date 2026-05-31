import { describe, expect, it } from "vitest";
import {
  buildCheckoutUrlForVariant,
  defaultVariantSelection,
  findVariantByColorSize,
  isPersonalizeVariantCheckoutReady,
  mergeVariantMatrixWithConfig,
  resolveProductVariants,
  variantHasShopifyCheckout,
} from "../../site/js/shop-product-variants-core.mjs";

const MATRIX = {
  variants: [
    {
      print_variant_id: "black-m",
      label: "Black / M",
      color: "Black",
      size: "M",
      printify_variant_id: 68861,
    },
    {
      print_variant_id: "white-xl",
      label: "White / XL",
      color: "White",
      size: "XL",
      printify_variant_id: 68884,
    },
  ],
};

describe("shop-product-variants-core", () => {
  it("merges Shopify overrides onto matrix by print_variant_id", () => {
    const merged = mergeVariantMatrixWithConfig(MATRIX.variants, [
      {
        print_variant_id: "black-m",
        shopify_variant_id: "999",
        checkout_url: "https://humanity-llc.myshopify.com/cart/999:1",
      },
    ]);
    expect(merged[0]?.shopify_variant_id).toBe("999");
    expect(merged[0]?.checkout_url).toContain("/cart/999:1");
    expect(merged[1]?.shopify_variant_id).toBe("");
  });

  it("resolves glitch product variants from matrix payload", () => {
    const product = {
      product_id: "glitch_hoodie_v1",
      variant_matrix: "glitch_hoodie_v1",
      variants: [],
    };
    const rows = resolveProductVariants(product, MATRIX);
    expect(rows).toHaveLength(2);
    expect(findVariantByColorSize(rows, "White", "XL")?.printify_variant_id).toBe(68884);
  });

  it("defaults to Black / M when available", () => {
    const rows = resolveProductVariants(
      { product_id: "glitch_hoodie_v1", variant_matrix: "glitch_hoodie_v1" },
      MATRIX
    );
    const defaults = defaultVariantSelection(rows);
    expect(defaults.color).toBe("Black");
    expect(defaults.size).toBe("M");
  });

  it("checkout ready only when selected variant has cart url", () => {
    const product = { product_id: "glitch_hoodie_v1" };
    const config = { personalize: { checkout_open: true, checkout_product_id: "glitch_hoodie_v1" } };
    const wired = {
      print_variant_id: "black-m",
      label: "Black / M",
      color: "Black",
      size: "M",
      printify_variant_id: 68861,
      shopify_variant_id: "999",
      checkout_url: "https://humanity-llc.myshopify.com/cart/999:1",
    };
    const unwired = {
      print_variant_id: "white-xl",
      label: "White / XL",
      color: "White",
      size: "XL",
      printify_variant_id: 68884,
      shopify_variant_id: "",
      checkout_url: "",
    };
    expect(variantHasShopifyCheckout(wired)).toBe(true);
    expect(isPersonalizeVariantCheckoutReady(config, product, wired)).toBe(true);
    expect(isPersonalizeVariantCheckoutReady(config, product, unwired)).toBe(false);
  });

  it("buildCheckoutUrlForVariant uses site origin", () => {
    expect(buildCheckoutUrlForVariant("https://humanity.llc", "black-m", "12345")).toBe(
      "https://humanity.llc/cart/12345:1"
    );
  });
});

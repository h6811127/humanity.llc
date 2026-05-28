import { describe, expect, it } from "vitest";

import {
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  mergePersonalizeWithCatalog,
  personalizableCatalogProducts,
  previewKindFromCatalogType,
  resolvePersonalizeProducts,
  resolvePrintTemplateId,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "../../site/js/shop-print-catalog-core.mjs";

const CATALOG = {
  products: [
    {
      template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
      type: "sticker",
      personalizable: false,
      title: "Tier 0 batch",
      variants: [{ variant_id: "tier0-batch", enabled: true }],
    },
    {
      template_id: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
      type: "hoodie",
      title: "Live Object hoodie",
      description: "Unique QR per unit.",
      variants: [
        { variant_id: "black-m", label: "Black / M", enabled: true },
        { variant_id: "black-l", label: "Black / L", enabled: true },
      ],
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

describe("shop-print-catalog-core", () => {
  it("filters Tier 0 batch from personalizable catalog", () => {
    const personalizable = personalizableCatalogProducts(CATALOG);
    expect(personalizable.map((p) => p.template_id)).toEqual([
      HOODIE_LIVE_OBJECT_TEMPLATE_ID,
      "hc-sticker-square-v1",
    ]);
  });

  it("maps catalog type to preview kind", () => {
    expect(previewKindFromCatalogType("sticker")).toBe("sticker");
    expect(previewKindFromCatalogType("hoodie")).toBe("hoodie");
  });

  it("resolves print_template_id from config or defaults", () => {
    expect(
      resolvePrintTemplateId({
        product_id: "hoodie_live_object_v1",
      })
    ).toBe(HOODIE_LIVE_OBJECT_TEMPLATE_ID);
    expect(
      resolvePrintTemplateId({
        product_id: "custom",
        print_template_id: "hc-custom-v1",
      })
    ).toBe("hc-custom-v1");
  });

  it("merges shop-config commerce fields with approved catalog templates", () => {
    const merged = mergePersonalizeWithCatalog(
      {
        personalize: {
          products: [
            {
              product_id: "hoodie_live_object_v1",
              title: "Live Object hoodie",
              price_display: "$48 + shipping",
              checkout_url: "https://store.example/cart/1:1",
            },
            {
              product_id: "sticker_personalized_v1",
              title: "Personalized sticker",
            },
            {
              product_id: "unknown_product",
              title: "Should drop",
            },
          ],
        },
      },
      personalizableCatalogProducts(CATALOG)
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      product_id: "hoodie_live_object_v1",
      print_template_id: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
      print_variant_id: "black-m",
      preview: "hoodie",
      catalog_description: "Unique QR per unit.",
    });
    expect(merged[1]).toMatchObject({
      product_id: "sticker_personalized_v1",
      print_template_id: "hc-sticker-square-v1",
      preview: "sticker",
    });
  });

  it("falls back to shop-config when catalog fetch is empty", () => {
    const products = resolvePersonalizeProducts(
      {
        personalize: {
          products: [{ product_id: "hoodie_live_object_v1", title: "Fallback hoodie" }],
        },
      },
      { products: [] }
    );
    expect(products).toEqual([
      { product_id: "hoodie_live_object_v1", title: "Fallback hoodie" },
    ]);
  });
});

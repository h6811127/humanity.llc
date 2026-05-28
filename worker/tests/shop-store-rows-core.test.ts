import { describe, expect, it } from "vitest";

import {
  enrichStoreRows,
  productAvailabilityLabel,
  renderStoreRowsHtml,
  resolveProductAvailability,
  resolveProductPriceDisplay,
  rowAggregateStatus,
} from "../../site/js/shop-store-rows-core.mjs";

const ROWS = [
  {
    row_id: "row_personalize",
    title: "Make it yours",
    story: "Tier 1 belonging.",
    products: [
      {
        product_id: "sticker_personalized_v1",
        title: "Personalized sticker",
        meaning_line: "Unique QR sticker.",
        product_class: "personalized",
        personalization_indicator: "Personalized QR",
        detail_path: "/shop/products/sticker_personalized_v1/",
        cta_label: "View product",
        price_display: "$12 + shipping",
      },
      {
        product_id: "hoodie_live_object_v1",
        title: "Live Object hoodie",
        meaning_line: "Unique QR hoodie.",
        product_class: "personalized",
        personalization_indicator: "Personalized QR",
        detail_path: "/shop/customize/?product=hoodie_live_object_v1",
        cta_label: "Preview on hoodie",
        price_display: "$48 + shipping",
      },
    ],
  },
  {
    row_id: "row_founding",
    title: "Founding objects",
    story: "Tier 0 curiosity.",
    products: [
      {
        product_id: "tier0_founding_sticker_v1",
        title: "Founding signal sticker",
        meaning_line: "Batch QR.",
        product_class: "limited_drop",
        personalization_indicator: "Limited Drop",
        detail_path: "/shop/products/tier0_founding_sticker_v1/",
        cta_label: "View product",
        price_display: null,
      },
    ],
  },
];

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
      {
        product_id: "hoodie_live_object_v1",
        print_template_id: "hc-hoodie-live-object-v1",
        price_display: "$48 + shipping",
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
    {
      template_id: "hc-hoodie-live-object-v1",
      type: "hoodie",
      variants: [{ variant_id: "black-m", enabled: true }],
    },
  ],
};

describe("shop-store-rows-core", () => {
  it("marks founding product checkout from tier0 config", () => {
    expect(
      resolveProductAvailability(CONFIG, CATALOG, {
        product_id: "tier0_founding_sticker_v1",
        product_class: "limited_drop",
      })
    ).toBe("checkout");
    expect(
      resolveProductPriceDisplay(CONFIG, {
        product_id: "tier0_founding_sticker_v1",
        price_display: null,
      })
    ).toBe("$8 + shipping");
  });

  it("marks only configured checkout SKU as checkout for personalize row", () => {
    expect(
      resolveProductAvailability(CONFIG, CATALOG, {
        product_id: "sticker_personalized_v1",
        product_class: "personalized",
      })
    ).toBe("checkout");
    expect(
      resolveProductAvailability(CONFIG, CATALOG, {
        product_id: "hoodie_live_object_v1",
        product_class: "personalized",
      })
    ).toBe("preview");
  });

  it("enriches rows with availability and price", () => {
    const enriched = enrichStoreRows(CONFIG, CATALOG, ROWS);
    expect(enriched[0]?.products[0]?.availability).toBe("checkout");
    expect(enriched[0]?.products[1]?.availability).toBe("preview");
    expect(enriched[1]?.products[0]?.availability).toBe("checkout");
  });

  it("derives row aggregate status labels", () => {
    const enriched = enrichStoreRows(CONFIG, CATALOG, ROWS);
    expect(rowAggregateStatus(enriched[0]!)).toMatchObject({ live: true });
    expect(productAvailabilityLabel({ availability: "preview" })).toContain("Preview live");
  });

  it("renders story rows HTML with product cards", () => {
    const html = renderStoreRowsHtml(enrichStoreRows(CONFIG, CATALOG, ROWS));
    expect(html).toContain('id="shop-row-row_personalize"');
    expect(html).toContain("Personalized sticker");
    expect(html).toContain('href="/shop/products/tier0_founding_sticker_v1/"');
  });
});

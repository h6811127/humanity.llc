import { describe, expect, it } from "vitest";

import {
  FOUNDING_PURSE_STORE_PRODUCT_ID,
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
  getLegacyStoreProductRedirect,
  getPublishedStoreRows,
  getStoreProductById,
  storeProductActionPath,
  storeProductDetailPath,
  toStoreProductDetail,
  toStoreRowProductCard,
  type StoreCatalogProduct,
} from "../src/store/store-catalog";

function catalogProduct(
  overrides: Partial<StoreCatalogProduct> = {}
): StoreCatalogProduct {
  return {
    product_id: "example_general_v1",
    title: "Example artifact",
    meaning_line: "Example",
    story: "Example story",
    product_class: "general",
    personalization_indicator: "General",
    requires_card: false,
    supports_personalization: false,
    fulfillment_provider: "none",
    print_template_id: null,
    price_display: null,
    detail_path: "/shop/products/example_general_v1/",
    cta_label: "View product",
    status: "published",
    row_ids: [],
    ...overrides,
  };
}

describe("storeProductDetailPath", () => {
  it("trims and percent-encodes product ids", () => {
    expect(storeProductDetailPath("  hoodie_live_object_v1  ")).toBe(
      "/shop/products/hoodie_live_object_v1/"
    );
    expect(storeProductDetailPath("a b/c+d")).toBe("/shop/products/a%20b%2Fc%2Bd/");
  });
});

describe("storeProductActionPath", () => {
  it("sends the founding sticker to the dedicated checkout path", () => {
    const founding = getStoreProductById(TIER0_FOUNDING_STORE_PRODUCT_ID);
    expect(founding).not.toBeNull();
    expect(storeProductActionPath(founding!)).toBe("/shop/founding/");
    expect(
      storeProductActionPath(
        catalogProduct({
          product_id: TIER0_FOUNDING_STORE_PRODUCT_ID,
          product_class: "general",
        })
      )
    ).toBe("/shop/founding/");
  });

  it("sends personalized SKUs to the customizer with an encoded product query", () => {
    expect(
      storeProductActionPath(
        catalogProduct({
          product_id: GLITCH_HOODIE_STORE_PRODUCT_ID,
          product_class: "personalized",
        })
      )
    ).toBe(`/shop/customize/?product=${encodeURIComponent(GLITCH_HOODIE_STORE_PRODUCT_ID)}`);
    expect(
      storeProductActionPath(
        catalogProduct({
          product_id: "wear me/now",
          product_class: "personalized",
        })
      )
    ).toBe("/shop/customize/?product=wear%20me%2Fnow");
  });

  it("falls back to the PDP for general and limited-drop SKUs", () => {
    expect(storeProductActionPath(catalogProduct())).toBe(
      "/shop/products/example_general_v1/"
    );
    expect(
      storeProductActionPath(
        catalogProduct({
          product_id: TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
          product_class: "limited_drop",
        })
      )
    ).toBe(`/shop/products/${TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID}/`);
  });
});

describe("getLegacyStoreProductRedirect", () => {
  it("maps only the legacy shared-batch Glitch id after trim", () => {
    expect(getLegacyStoreProductRedirect(`  ${TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID}  `)).toBe(
      GLITCH_HOODIE_STORE_PRODUCT_ID
    );
    expect(getLegacyStoreProductRedirect(GLITCH_HOODIE_STORE_PRODUCT_ID)).toBeNull();
    expect(getLegacyStoreProductRedirect(TIER0_FOUNDING_STORE_PRODUCT_ID)).toBeNull();
    expect(getLegacyStoreProductRedirect("")).toBeNull();
    expect(getLegacyStoreProductRedirect("   ")).toBeNull();
    expect(getLegacyStoreProductRedirect("unknown_sku")).toBeNull();
  });
});

describe("getStoreProductById", () => {
  it("trims lookup keys and rejects blank or unknown ids", () => {
    expect(getStoreProductById(`  ${FOUNDING_PURSE_STORE_PRODUCT_ID}  `)?.product_id).toBe(
      FOUNDING_PURSE_STORE_PRODUCT_ID
    );
    expect(getStoreProductById("")).toBeNull();
    expect(getStoreProductById("   ")).toBeNull();
    expect(getStoreProductById("missing_sku_v1")).toBeNull();
  });
});

describe("storefront card and detail mapping", () => {
  it("copies action_path from the routing helper and marks cards coming_soon", () => {
    const founding = getStoreProductById(TIER0_FOUNDING_STORE_PRODUCT_ID)!;
    const card = toStoreRowProductCard(founding);
    expect(card.action_path).toBe("/shop/founding/");
    expect(card.availability).toBe("coming_soon");
    expect(card.detail_path).toBe(founding.detail_path);

    const personalized = getStoreProductById(GLITCH_HOODIE_STORE_PRODUCT_ID)!;
    expect(toStoreRowProductCard(personalized).action_path).toBe(
      `/shop/customize/?product=${encodeURIComponent(GLITCH_HOODIE_STORE_PRODUCT_ID)}`
    );
  });

  it("includes action_path on product detail payloads", () => {
    const detail = toStoreProductDetail(getStoreProductById(TIER0_FOUNDING_STORE_PRODUCT_ID)!);
    expect(detail.action_path).toBe("/shop/founding/");
    expect(detail.status).toBe("published");
    expect(detail.supports_personalization).toBe(false);
  });

  it("publishes founding vs personalize action paths on launch rows", () => {
    const rows = getPublishedStoreRows();
    const personalize = rows.find((row) => row.row_id === "row_personalize")?.products ?? [];
    const founding = rows.find((row) => row.row_id === "row_founding")?.products ?? [];
    expect(personalize.map((product) => product.action_path)).toEqual([
      `/shop/customize/?product=${encodeURIComponent(GLITCH_HOODIE_STORE_PRODUCT_ID)}`,
      `/shop/customize/?product=${encodeURIComponent(FOUNDING_PURSE_STORE_PRODUCT_ID)}`,
    ]);
    expect(founding.map((product) => product.action_path)).toEqual(["/shop/founding/"]);
  });
});

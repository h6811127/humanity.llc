import { describe, expect, it } from "vitest";

import {
  getPublishedStoreRows,
  getStoreCatalogProductCount,
  getStoreProductById,
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
  getLegacyStoreProductRedirect,
} from "../src/store/store-catalog";

describe("store-catalog", () => {
  it("represents approximately 50 product records", () => {
    expect(getStoreCatalogProductCount()).toBeGreaterThanOrEqual(48);
  });

  it("returns only published launch rows with published products", () => {
    const rows = getPublishedStoreRows();
    expect(rows.map((row) => row.row_id)).toEqual(["row_personalize", "row_founding"]);
    expect(rows[0]?.products.map((product) => product.product_id)).toEqual([
      GLITCH_HOODIE_STORE_PRODUCT_ID,
    ]);
    expect(rows[1]?.products.map((product) => product.product_id)).toEqual([
      TIER0_FOUNDING_STORE_PRODUCT_ID,
    ]);
  });

  it("exposes Glitch as Tier 1 personalized product", () => {
    const product = getStoreProductById(GLITCH_HOODIE_STORE_PRODUCT_ID);
    expect(product?.status).toBe("published");
    expect(product?.product_class).toBe("personalized");
    expect(product?.supports_personalization).toBe(true);
    expect(product?.meaning_line).toMatch(/your unique QR/i);
  });

  it("hides legacy shared-batch Glitch PDP from published rows", () => {
    expect(getStoreProductById(TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID)?.status).toBe("hidden");
    const rows = getPublishedStoreRows();
    const foundingProducts = rows.find((row) => row.row_id === "row_founding")?.products ?? [];
    expect(foundingProducts.some((p) => p.product_id === TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID)).toBe(
      false
    );
  });

  it("maps legacy Glitch id to launch personalize SKU", () => {
    expect(getLegacyStoreProductRedirect(TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID)).toBe(
      GLITCH_HOODIE_STORE_PRODUCT_ID
    );
  });

  it("hides optional Tier 1 SKUs from published storefront rows", () => {
    expect(getStoreProductById("sticker_personalized_v1")?.status).toBe("hidden");
    expect(getStoreProductById("hoodie_live_object_v1")?.status).toBe("hidden");
  });

  it("exposes hidden catalog SKUs for customizer lookup", () => {
    const product = getStoreProductById("sticker_personalized_v1");
    expect(product?.status).toBe("hidden");
    expect(product?.supports_personalization).toBe(true);
    expect(product?.detail_path).toBe("/shop/products/sticker_personalized_v1/");
  });

  it("hides draft catalog products from lookup", () => {
    expect(getStoreProductById("draft_row_wear_1")?.status).toBe("draft");
  });
});

import { describe, expect, it } from "vitest";

import {
  getPublishedStoreRows,
  getStoreCatalogProductCount,
  getStoreProductById,
  TIER0_FOUNDING_STORE_PRODUCT_ID,
} from "../src/store/store-catalog";

describe("store-catalog", () => {
  it("represents approximately 50 product records", () => {
    expect(getStoreCatalogProductCount()).toBeGreaterThanOrEqual(48);
  });

  it("returns only published launch rows with published products", () => {
    const rows = getPublishedStoreRows();
    expect(rows.map((row) => row.row_id)).toEqual(["row_personalize", "row_founding"]);
    expect(rows[0]?.products.map((product) => product.product_id)).toEqual([
      "hoodie_live_object_v1",
      "sticker_personalized_v1",
    ]);
    expect(rows[1]?.products.map((product) => product.product_id)).toEqual([
      TIER0_FOUNDING_STORE_PRODUCT_ID,
    ]);
  });

  it("exposes published product detail", () => {
    const product = getStoreProductById("sticker_personalized_v1");
    expect(product?.status).toBe("published");
    expect(product?.supports_personalization).toBe(true);
    expect(product?.detail_path).toContain("/shop/customize/");
  });

  it("hides draft catalog products from lookup", () => {
    expect(getStoreProductById("draft_row_wear_1")?.status).toBe("draft");
  });
});

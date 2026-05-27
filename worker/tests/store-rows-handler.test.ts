import { describe, expect, it } from "vitest";

import { handleGetStoreProduct, handleGetStoreRows } from "../src/store/store-rows-handler";

describe("store-rows-handler", () => {
  it("GET /v1/store/rows returns ordered published rows", async () => {
    const res = await handleGetStoreRows();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(1);
    expect(body.catalog_product_count).toBeGreaterThanOrEqual(48);
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].row_id).toBe("row_personalize");
    expect(body.rows[0].products[0]).toMatchObject({
      product_id: "hoodie_live_object_v1",
      personalization_indicator: "Personalized QR",
      detail_path: "/shop/products/hoodie_live_object_v1/",
      cta_label: "View product",
    });
  });

  it("GET /v1/store/products/{id} returns published product", async () => {
    const res = await handleGetStoreProduct("tier0_founding_sticker_v1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.product_id).toBe("tier0_founding_sticker_v1");
    expect(body.requires_card).toBe(false);
    expect(body.detail_path).toBe("/shop/products/tier0_founding_sticker_v1/");
    expect(body.action_path).toBe("/shop/founding/");
  });

  it("GET /v1/store/products/{id} 404 for draft product", async () => {
    const res = await handleGetStoreProduct("draft_row_wear_1");
    expect(res.status).toBe(404);
  });
});

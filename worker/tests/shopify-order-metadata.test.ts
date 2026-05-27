import { describe, expect, it } from "vitest";

import {
  extractShopifyOrderMetadata,
  shopifyOrderIsPaid,
} from "../src/commerce/shopify-order-metadata";

describe("extractShopifyOrderMetadata", () => {
  it("reads artifact_intent_id from line item properties", () => {
    const meta = extractShopifyOrderMetadata({
      id: 450789469,
      checkout_id: 901414060,
      line_items: [
        {
          properties: [
            { name: "artifact_intent_id", value: "ai_testIntent123456" },
            { name: "profile_id", value: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5" },
          ],
        },
      ],
    });
    expect(meta).toMatchObject({
      shopify_order_id: "450789469",
      shopify_checkout_id: "901414060",
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      artifact_intent_ids: ["ai_testIntent123456"],
    });
  });

  it("dedupes comma-separated intent ids", () => {
    const meta = extractShopifyOrderMetadata({
      id: 1,
      note_attributes: [{ name: "artifact_intent_id", value: "ai_one,ai_two" }],
      line_items: [{ properties: [{ name: "artifact_intent_id", value: "ai_two" }] }],
    });
    expect(meta?.artifact_intent_ids).toEqual(["ai_one", "ai_two"]);
  });
});

describe("shopifyOrderIsPaid", () => {
  it("accepts paid and partially_paid", () => {
    expect(shopifyOrderIsPaid({ financial_status: "paid" })).toBe(true);
    expect(shopifyOrderIsPaid({ financial_status: "partially_paid" })).toBe(true);
    expect(shopifyOrderIsPaid({ financial_status: "pending" })).toBe(false);
  });
});

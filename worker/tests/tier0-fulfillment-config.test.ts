import { describe, expect, it } from "vitest";

import { readTier0FulfillmentConfig, readTier0InventoryFulfillmentConfig } from "../src/commerce/tier0-fulfillment-config";

describe("readTier0FulfillmentConfig", () => {
  it("returns null when env is incomplete", () => {
    expect(readTier0FulfillmentConfig({})).toBeNull();
    expect(
      readTier0FulfillmentConfig({ TIER0_CAMPAIGN_PROFILE_ID: "abc123" })
    ).toBeNull();
  });

  it("parses comma-separated variant ids", () => {
    const config = readTier0FulfillmentConfig({
      TIER0_CAMPAIGN_PROFILE_ID: "nSVXWPqgRFEhGPjxyRzidF6",
      TIER0_SHOPIFY_VARIANT_IDS: "111, 222",
    });
    expect(config?.campaign_profile_id).toBe("nSVXWPqgRFEhGPjxyRzidF6");
    expect([...config!.shopify_variant_ids]).toEqual(["111", "222"]);
  });
});

describe("readTier0InventoryFulfillmentConfig", () => {
  it("returns null when env is incomplete", () => {
    expect(readTier0InventoryFulfillmentConfig({})).toBeNull();
  });

  it("parses inventory variant ids separately from batch ids", () => {
    const config = readTier0InventoryFulfillmentConfig({
      TIER0_CAMPAIGN_PROFILE_ID: "nSVXWPqgRFEhGPjxyRzidF6",
      TIER0_SHOPIFY_INVENTORY_VARIANT_IDS: "333",
    });
    expect(config?.campaign_profile_id).toBe("nSVXWPqgRFEhGPjxyRzidF6");
    expect([...config!.shopify_variant_ids]).toEqual(["333"]);
  });
});

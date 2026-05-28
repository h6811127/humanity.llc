import { describe, expect, it } from "vitest";

import { buildBuyerOrderStatus } from "../src/commerce/buyer-order-status";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

const COMMERCE: CommerceOrderRow = {
  commerce_order_id: "co_testBuyerStatus01",
  shopify_order_id: "450789469",
  shopify_checkout_id: "901414060",
  shopify_order_number: 1001,
  buyer_email_hash: "abc",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  artifact_intent_ids_json: JSON.stringify(["ai_testIntent001"]),
  print_order_ids_json: JSON.stringify(["po_testPrintOrder1"]),
  status: "processing",
  hold_reason: null,
  created_at: "2026-05-16T17:00:00Z",
  updated_at: "2026-05-16T17:00:00Z",
};

const PRINT_BASE: PrintOrderRow = {
  order_id: "po_testPrintOrder1",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  print_artifact_ids_json: "[]",
  planned_item_qr_ids_json: "[]",
  commerce_order_id: COMMERCE.commerce_order_id,
  shopify_order_id: COMMERCE.shopify_order_id,
  printify_order_id: null,
  printify_shop_id: null,
  template_id: "hc-sticker-square-v1",
  status: "awaiting_production_approval",
  shipping_method: "standard",
  tracking_carrier: null,
  tracking_number: null,
  tracking_url: null,
  last_reconciled_at: null,
  created_at: "2026-05-16T17:00:00Z",
  updated_at: "2026-05-16T17:05:00Z",
};

describe("buildBuyerOrderStatus", () => {
  it("maps held commerce orders to under review copy", () => {
    const status = buildBuyerOrderStatus(
      { ...COMMERCE, status: "held_for_review", hold_reason: "CHECKOUT_METADATA_MISSING" },
      []
    );
    expect(status.status).toBe("held");
    expect(status.order_number).toBe("#1001");
    expect(status.message).toContain("verify checkout");
  });

  it("maps in_production print status for personalized orders", () => {
    const status = buildBuyerOrderStatus(COMMERCE, [
      { ...PRINT_BASE, status: "in_production" },
    ]);
    expect(status.status).toBe("in_production");
    expect(status.fulfillment_mode).toBe("personalized");
    expect(status.status_label).toBe("In production");
  });

  it("maps fulfilled print status to shipped", () => {
    const status = buildBuyerOrderStatus(COMMERCE, [{ ...PRINT_BASE, status: "fulfilled" }]);
    expect(status.status).toBe("shipped");
  });

  it("includes tracking link when print order has carrier data", () => {
    const status = buildBuyerOrderStatus(COMMERCE, [
      {
        ...PRINT_BASE,
        status: "fulfilled",
        tracking_carrier: "USPS",
        tracking_number: "9400111899223344556677",
        tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
      },
    ]);
    expect(status.tracking?.tracking_url).toContain("usps.com");
    expect(status.message).toContain("tracking link");
  });

  it("uses inventory copy for tier0_inventory orders without print queue", () => {
    const commerce: CommerceOrderRow = {
      ...COMMERCE,
      artifact_intent_ids_json: "[]",
      print_order_ids_json: "[]",
      profile_id: "nSVXWPqgRFEhGPjxyRzidF6",
    };
    const status = buildBuyerOrderStatus(commerce, []);
    expect(status.fulfillment_mode).toBe("tier0_inventory");
    expect(status.status).toBe("processing");
    expect(status.message).toContain("store inventory");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildOrderTimeline,
  buildStoreOrderStatusResponse,
  isValidArtifactIntentLookupId,
  printStatusLabel,
} from "../src/store/store-order-status";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

function commerce(overrides: Partial<CommerceOrderRow> = {}): CommerceOrderRow {
  return {
    commerce_order_id: "co_test123456789012345",
    shopify_order_id: "450789469",
    shopify_checkout_id: "901414060",
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    artifact_intent_ids_json: JSON.stringify(["ai_PaidWebhookTest01"]),
    print_order_ids_json: JSON.stringify(["po_test123456789012345"]),
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T18:00:00Z",
    ...overrides,
  };
}

function printOrder(overrides: Partial<PrintOrderRow> = {}): PrintOrderRow {
  return {
    order_id: "po_test123456789012345",
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: '["qr_planned1"]',
    commerce_order_id: "co_test123456789012345",
    shopify_order_id: "450789469",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T18:00:00Z",
    ...overrides,
  };
}

describe("store-order-status", () => {
  it("validates artifact intent lookup ids", () => {
    expect(isValidArtifactIntentLookupId("ai_Hc9mP2nQ4rT6vW8yZ1")).toBe(true);
    expect(isValidArtifactIntentLookupId("bad")).toBe(false);
  });

  it("builds timeline for processing personalized order", () => {
    const timeline = buildOrderTimeline(
      commerce(),
      printOrder(),
      "sticker_personalized_v1"
    );
    expect(timeline[0]?.state).toBe("complete");
    expect(timeline.some((step) => step.id === "print_queued" && step.state === "current")).toBe(
      true
    );
    expect(timeline.some((step) => step.id === "shipped")).toBe(true);
  });

  it("marks held orders with issue state", () => {
    const timeline = buildOrderTimeline(
      commerce({ status: "held_for_review", hold_reason: "CHECKOUT_METADATA_MISSING" }),
      null,
      null
    );
    expect(timeline[0]?.state).toBe("issue");
    expect(timeline[0]?.detail).toMatch(/verify order details/i);
  });

  it("builds safe response without internal ids", () => {
    const response = buildStoreOrderStatusResponse(
      commerce(),
      printOrder({ status: "in_production" }),
      "sticker_personalized_v1"
    );
    expect(response.fulfillment_mode).toBe("personalized");
    expect(response.print_status_label).toBe("In production");
    expect(JSON.stringify(response)).not.toMatch(/commerce_order_id|shopify_order_id/);
  });

  it("labels print statuses for shoppers", () => {
    expect(printStatusLabel("fulfilled")).toBe("Shipped");
    expect(printStatusLabel("awaiting_production_approval")).toBe("Awaiting print approval");
  });
});

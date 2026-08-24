import { describe, expect, it } from "vitest";

import {
  buildBuyerOrderStatus,
  pickDominantPrintOrder,
} from "../src/commerce/buyer-order-status";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

const COMMERCE: CommerceOrderRow = {
  commerce_order_id: "co_testBuyerStatus02",
  shopify_order_id: "450789470",
  shopify_checkout_id: "901414061",
  shopify_order_number: 1002,
  buyer_email_hash: "def",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  artifact_intent_ids_json: JSON.stringify(["ai_testIntent002"]),
  print_order_ids_json: JSON.stringify(["po_testPrintOrder2"]),
  status: "processing",
  hold_reason: null,
  created_at: "2026-05-16T17:00:00Z",
  updated_at: "2026-05-16T17:00:00Z",
};

function printOrder(overrides: Partial<PrintOrderRow> = {}): PrintOrderRow {
  return {
    order_id: "po_testPrintOrder2",
    profile_id: COMMERCE.profile_id!,
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: COMMERCE.commerce_order_id,
    shopify_order_id: COMMERCE.shopify_order_id,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    print_variant_id: null,
    print_frame_background: "full",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    tracking_carrier: null,
    tracking_number: null,
    tracking_url: null,
    last_reconciled_at: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:05:00Z",
    ...overrides,
  };
}

describe("pickDominantPrintOrder", () => {
  it("returns null when there are no print orders", () => {
    expect(pickDominantPrintOrder([])).toBeNull();
  });

  it("prefers fulfilled over in-flight and canceled rows", () => {
    const canceled = printOrder({ order_id: "po_canceled", status: "canceled" });
    const submitted = printOrder({ order_id: "po_submitted", status: "submitted" });
    const fulfilled = printOrder({
      order_id: "po_fulfilled",
      status: "fulfilled",
      tracking_number: "9400111899223344556677",
    });
    const picked = pickDominantPrintOrder([canceled, submitted, fulfilled]);
    expect(picked?.order_id).toBe("po_fulfilled");
  });

  it("keeps the first row when several share the winning status", () => {
    const first = printOrder({
      order_id: "po_firstFulfilled",
      status: "fulfilled",
      tracking_url: "https://example.test/first",
    });
    const second = printOrder({
      order_id: "po_secondFulfilled",
      status: "fulfilled",
      tracking_url: "https://example.test/second",
    });
    expect(pickDominantPrintOrder([first, second])?.order_id).toBe("po_firstFulfilled");
  });

  it("ranks partially_fulfilled with fulfilled and issues below in_production", () => {
    const issue = printOrder({ order_id: "po_issue", status: "has_issues" });
    const partial = printOrder({
      order_id: "po_partial",
      status: "partially_fulfilled",
    });
    const inProduction = printOrder({
      order_id: "po_prod",
      status: "in_production",
    });
    expect(pickDominantPrintOrder([issue, inProduction, partial])?.order_id).toBe(
      "po_partial"
    );
  });
});

describe("buildBuyerOrderStatus edges", () => {
  it("keeps held_for_review even when a print row has tracking", () => {
    const status = buildBuyerOrderStatus(
      { ...COMMERCE, status: "held_for_review", hold_reason: "QTY_MISMATCH" },
      [
        printOrder({
          status: "fulfilled",
          tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
        }),
      ]
    );
    expect(status.status).toBe("held");
    expect(status.tracking).toBeNull();
    expect(status.message).toMatch(/verify checkout/i);
  });

  it("maps canceled and refunded commerce rows to canceled without print tracking", () => {
    for (const commerceStatus of ["canceled", "refunded"] as const) {
      const status = buildBuyerOrderStatus({ ...COMMERCE, status: commerceStatus }, [
        printOrder({
          status: "fulfilled",
          tracking_number: "9400111899223344556677",
        }),
      ]);
      expect(status.status).toBe("canceled");
      expect(status.tracking).toBeNull();
      expect(status.message).toMatch(/canceled or refunded/i);
    }
  });

  it("omits order_number when Shopify number is missing or not finite", () => {
    expect(
      buildBuyerOrderStatus({ ...COMMERCE, shopify_order_number: null }, []).order_number
    ).toBeNull();
    expect(
      buildBuyerOrderStatus({ ...COMMERCE, shopify_order_number: Number.NaN }, [])
        .order_number
    ).toBeNull();
  });

  it("uses tracking-number copy when shipped without a URL", () => {
    const status = buildBuyerOrderStatus(COMMERCE, [
      printOrder({
        status: "fulfilled",
        tracking_carrier: "USPS",
        tracking_number: "9400111899223344556677",
      }),
    ]);
    expect(status.status).toBe("shipped");
    expect(status.message).toContain("9400111899223344556677");
    expect(status.message).not.toMatch(/tracking link/i);
  });

  it("maps issue print statuses and default awaiting approval", () => {
    expect(
      buildBuyerOrderStatus(COMMERCE, [printOrder({ status: "on_hold" })]).status
    ).toBe("issue");
    expect(
      buildBuyerOrderStatus(COMMERCE, [printOrder({ status: "unfulfillable" })]).status
    ).toBe("issue");
    expect(
      buildBuyerOrderStatus(COMMERCE, [
        printOrder({ status: "awaiting_production_approval" }),
      ]).status
    ).toBe("processing");
  });

  it("surfaces the dominant fulfilled row when siblings are canceled", () => {
    const status = buildBuyerOrderStatus(COMMERCE, [
      printOrder({ order_id: "po_old", status: "canceled" }),
      printOrder({
        order_id: "po_live",
        status: "fulfilled",
        tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
        updated_at: "2026-05-17T12:00:00Z",
      }),
    ]);
    expect(status.status).toBe("shipped");
    expect(status.tracking?.tracking_url).toContain("usps.com");
    expect(status.updated_at).toBe("2026-05-17T12:00:00Z");
  });
});

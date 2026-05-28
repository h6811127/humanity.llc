import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  tryAutoSubmitPrintOrderToPrintify,
  type AutoPrintifySubmitResult,
} from "../src/commerce/fulfillment-auto-mint";
import type { PrintOrderRow } from "../src/db/print-orders";
import type { Env } from "../src/env";
import * as fulfillmentMint from "../src/commerce/fulfillment-mint";
import * as printOrders from "../src/db/print-orders";
import * as printifySubmit from "../src/print/print-order-printify-submit";

const PRINT_ORDER = "po_autoSubmitTest01";

function printOrderRow(status: PrintOrderRow["status"] = "awaiting_production_approval"): PrintOrderRow {
  return {
    order_id: PRINT_ORDER,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: '["pa_test"]',
    planned_item_qr_ids_json: '["qr_test"]',
    commerce_order_id: "co_autoSubmitTest01",
    shopify_order_id: "450789472",
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-hoodie-live-object-v1",
    status,
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

describe("tryAutoSubmitPrintOrderToPrintify", () => {
  beforeEach(() => {
    vi.spyOn(printOrders, "getPrintOrderById").mockResolvedValue(printOrderRow());
    vi.spyOn(fulfillmentMint, "allPlannedQrsMinted").mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips when PRINTIFY_SUBMIT_ENABLED is off", async () => {
    const result = await tryAutoSubmitPrintOrderToPrintify(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders"),
      { PRINTIFY_SUBMIT_ENABLED: "0" } as Env,
      {} as D1Database,
      PRINT_ORDER
    );
    expect(result).toEqual({
      attempted: false,
      submitted: false,
      skipped: true,
    } satisfies AutoPrintifySubmitResult);
  });

  it("submits when enabled and all planned QRs are minted", async () => {
    vi.spyOn(printifySubmit, "submitPrintOrderToPrintify").mockResolvedValue({
      ok: true,
      printOrder: { ...printOrderRow(), status: "submitted", printify_order_id: "pf_123" },
    });

    const result = await tryAutoSubmitPrintOrderToPrintify(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders"),
      { PRINTIFY_SUBMIT_ENABLED: "1" } as Env,
      {} as D1Database,
      PRINT_ORDER
    );

    expect(result).toEqual({
      attempted: true,
      submitted: true,
      skipped: false,
    });
    expect(printifySubmit.submitPrintOrderToPrintify).toHaveBeenCalledOnce();
  });

  it("returns code when submit fails without failing the caller", async () => {
    vi.spyOn(printifySubmit, "submitPrintOrderToPrintify").mockResolvedValue({
      ok: false,
      code: "PRINTIFY_SHIPPING_REQUIRED",
      message: "shipping missing",
      httpStatus: 422,
    });

    const result = await tryAutoSubmitPrintOrderToPrintify(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders"),
      { PRINTIFY_SUBMIT_ENABLED: "1" } as Env,
      {} as D1Database,
      PRINT_ORDER
    );

    expect(result).toEqual({
      attempted: true,
      submitted: false,
      skipped: false,
      code: "PRINTIFY_SHIPPING_REQUIRED",
    });
  });

  it("skips idempotent re-submit when print order is no longer queued", async () => {
    vi.spyOn(printOrders, "getPrintOrderById").mockResolvedValue(
      printOrderRow("submitted")
    );
    vi.spyOn(printifySubmit, "submitPrintOrderToPrintify").mockResolvedValue({
      ok: true,
      printOrder: printOrderRow("submitted"),
      skipped: true,
    });

    const result = await tryAutoSubmitPrintOrderToPrintify(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders"),
      { PRINTIFY_SUBMIT_ENABLED: "1" } as Env,
      {} as D1Database,
      PRINT_ORDER
    );

    expect(result.skipped).toBe(true);
    expect(result.submitted).toBe(false);
  });
});

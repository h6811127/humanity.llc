import { describe, expect, it } from "vitest";

import { ensurePrintOrderForCommerceOrder } from "../src/commerce/fulfillment-queue";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import {
  DEFAULT_PRINT_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_PRODUCT_ID,
  HOODIE_PRINT_TEMPLATE_ID,
} from "../src/print/print-catalog";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_FulfillQueueTest01";
const COMMERCE = "co_testCommerce1234";

function intentRow(overrides: Partial<ArtifactIntentRow> = {}): ArtifactIntentRow {
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "sticker_personalized_v1",
    print_variant_id: null,
    quantity: 1,
    planned_item_qr_ids_json: JSON.stringify(["qr_plannedFulfill1"]),
    planned_print_artifact_ids_json: JSON.stringify(["pa_plannedFulfill1"]),
    pending_mint_credentials_json: null,
    status: "converted",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function commerceOrder(overrides: Partial<CommerceOrderRow> = {}): CommerceOrderRow {
  return {
    commerce_order_id: COMMERCE,
    shopify_order_id: "450789469",
    shopify_checkout_id: "901414060",
    shopify_order_number: 1001,
    buyer_email_hash: null,
    profile_id: PROFILE,
    artifact_intent_ids_json: JSON.stringify([INTENT]),
    print_order_ids_json: "[]",
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

type State = {
  intents: Map<string, ArtifactIntentRow>;
  printOrders: Map<string, PrintOrderRow>;
  commercePrintOrderIds: Map<string, string[]>;
};

function dbFor(state: State): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM artifact_intents")) {
            return state.intents.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO print_orders")) {
            const row: PrintOrderRow = {
              order_id: args[0] as string,
              profile_id: args[1] as string,
              print_artifact_ids_json: args[2] as string,
              planned_item_qr_ids_json: args[3] as string,
              commerce_order_id: args[4] as string,
              shopify_order_id: args[5] as string,
              printify_order_id: null,
              printify_shop_id: null,
              template_id: args[6] as string,
              print_variant_id: (args[7] as string | null) ?? null,
              status: args[8] as PrintOrderRow["status"],
              shipping_method: args[9] as string,
              tracking_carrier: null,
              tracking_number: null,
              tracking_url: null,
              last_reconciled_at: null,
              created_at: args[10] as string,
              updated_at: args[11] as string,
            };
            state.printOrders.set(row.commerce_order_id, row);
          }
          if (sql.includes("UPDATE commerce_order_links") && sql.includes("print_order_ids_json")) {
            state.commercePrintOrderIds.set(args[2] as string, JSON.parse(args[0] as string));
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("ensurePrintOrderForCommerceOrder", () => {
  it("creates awaiting_production_approval print order from artifact intents", async () => {
    const state: State = {
      intents: new Map([[INTENT, intentRow()]]),
      printOrders: new Map(),
      commercePrintOrderIds: new Map(),
    };

    const result = await ensurePrintOrderForCommerceOrder(
      dbFor(state),
      commerceOrder(),
      "2026-05-16T18:00:00Z"
    );

    expect(result?.created).toBe(true);
    expect(result?.print_order.status).toBe("awaiting_production_approval");
    expect(result?.print_order.template_id).toBe(DEFAULT_PRINT_TEMPLATE_ID);
    expect(JSON.parse(result!.print_order.planned_item_qr_ids_json)).toEqual([
      "qr_plannedFulfill1",
    ]);
    expect(state.commercePrintOrderIds.get(COMMERCE)).toEqual([result!.print_order.order_id]);
  });

  it("uses hoodie print template when artifact intent product is hoodie", async () => {
    const state: State = {
      intents: new Map([
        [INTENT, intentRow({ product_id: HOODIE_LIVE_OBJECT_PRODUCT_ID })],
      ]),
      printOrders: new Map(),
      commercePrintOrderIds: new Map(),
    };

    const result = await ensurePrintOrderForCommerceOrder(
      dbFor(state),
      commerceOrder(),
      "2026-05-16T18:00:00Z"
    );

    expect(result?.print_order.template_id).toBe(HOODIE_PRINT_TEMPLATE_ID);
  });

  it("copies print_variant_id from artifact intent onto print order", async () => {
    const state: State = {
      intents: new Map([
        [
          INTENT,
          intentRow({
            product_id: "glitch_hoodie_v1",
            print_variant_id: "white-xl",
          }),
        ],
      ]),
      printOrders: new Map(),
      commercePrintOrderIds: new Map(),
    };

    const result = await ensurePrintOrderForCommerceOrder(
      dbFor(state),
      commerceOrder(),
      "2026-05-16T18:00:00Z"
    );

    expect(result?.print_order.print_variant_id).toBe("white-xl");
  });

  it("returns existing print order idempotently", async () => {
    const existing: PrintOrderRow = {
      order_id: "po_existing12345678",
      profile_id: PROFILE,
      print_artifact_ids_json: "[]",
      planned_item_qr_ids_json: "[]",
      commerce_order_id: COMMERCE,
      shopify_order_id: "450789469",
      printify_order_id: null,
      printify_shop_id: null,
      template_id: "hc-sticker-square-v1",
      print_variant_id: null,
      status: "awaiting_production_approval",
      shipping_method: "standard",
      tracking_carrier: null,
      tracking_number: null,
      tracking_url: null,
      last_reconciled_at: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };
    const state: State = {
      intents: new Map([[INTENT, intentRow()]]),
      printOrders: new Map([[COMMERCE, existing]]),
      commercePrintOrderIds: new Map(),
    };

    const result = await ensurePrintOrderForCommerceOrder(
      dbFor(state),
      commerceOrder(),
      "2026-05-16T18:00:00Z"
    );
    expect(result?.created).toBe(false);
    expect(result?.print_order.order_id).toBe("po_existing12345678");
  });

  it("skips held_for_review commerce orders", async () => {
    const state: State = {
      intents: new Map(),
      printOrders: new Map(),
      commercePrintOrderIds: new Map(),
    };
    const result = await ensurePrintOrderForCommerceOrder(
      dbFor(state),
      commerceOrder({ status: "held_for_review" }),
      "2026-05-16T18:00:00Z"
    );
    expect(result).toBeNull();
  });
});

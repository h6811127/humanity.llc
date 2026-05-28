import { describe, expect, it } from "vitest";

import { hashBuyerEmail } from "../src/commerce/buyer-email-hash";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { buildOrderTimeline } from "../src/store/store-order-status";
import { handleGetStoreOrderStatus } from "../src/resolver/store-order-status";

const EMAIL = "buyer@example.com";
const ORDER_NUMBER = 1001;
const SHOPIFY_ID = "450789469";

async function emailHash(): Promise<string> {
  return hashBuyerEmail(EMAIL);
}

function dbFor(commerce: CommerceOrderRow | null, printOrders: PrintOrderRow[] = []): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("WHERE shopify_order_id = ?")) {
            if (commerce && args[0] === commerce.shopify_order_id) return commerce;
            return null;
          }
          if (sql.includes("WHERE shopify_order_number = ?")) {
            if (commerce && args[0] === commerce.shopify_order_number) return commerce;
            return null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return printOrders[0] ?? null;
          }
          return null;
        },
        all: async () => ({ results: printOrders }),
      }),
    }),
  } as unknown as D1Database;
}

describe("buildOrderTimeline", () => {
  it("shows Shopify inventory steps for tier0_inventory commerce orders", () => {
    const commerce: CommerceOrderRow = {
      commerce_order_id: "co_tier0Inventory01",
      shopify_order_id: SHOPIFY_ID,
      shopify_checkout_id: null,
      shopify_order_number: ORDER_NUMBER,
      buyer_email_hash: "hash",
      profile_id: "nSVXWPqgRFEhGPjxyRzidF6",
      artifact_intent_ids_json: "[]",
      print_order_ids_json: "[]",
      status: "processing",
      hold_reason: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };

    const steps = buildOrderTimeline(commerce, null, "tier0_glitch_hoodie_v1");
    expect(steps.map((step) => step.id)).toEqual(["payment", "fulfillment", "shipped"]);
    expect(steps[1]?.detail).toContain("store inventory");
    expect(steps[1]?.state).toBe("current");
  });
});

describe("GET /v1/store/order-status", () => {
  it("returns buyer-safe status when email and order number match", async () => {
    const hash = await emailHash();
    const commerce: CommerceOrderRow = {
      commerce_order_id: "co_storeStatusTest01",
      shopify_order_id: SHOPIFY_ID,
      shopify_checkout_id: null,
      shopify_order_number: ORDER_NUMBER,
      buyer_email_hash: hash,
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      artifact_intent_ids_json: JSON.stringify(["ai_testIntent001"]),
      print_order_ids_json: "[]",
      status: "processing",
      hold_reason: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };
    const printOrder: PrintOrderRow = {
      order_id: "po_storeStatusTest1",
      profile_id: commerce.profile_id!,
      print_artifact_ids_json: "[]",
      planned_item_qr_ids_json: "[]",
      commerce_order_id: commerce.commerce_order_id,
      shopify_order_id: SHOPIFY_ID,
      printify_order_id: null,
      printify_shop_id: null,
      template_id: "hc-sticker-square-v1",
      status: "in_production",
      shipping_method: "standard",
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:10:00Z",
    };

    const res = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/order-status?order=${ORDER_NUMBER}&email=${encodeURIComponent(EMAIL)}`
      ),
      dbFor(commerce, [printOrder])
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: string;
      order_number: string;
      fulfillment_mode: string;
    };
    expect(json.status).toBe("in_production");
    expect(json.order_number).toBe("#1001");
    expect(json.fulfillment_mode).toBe("personalized");
  });

  it("returns 404 for wrong email without leaking existence", async () => {
    const commerce: CommerceOrderRow = {
      commerce_order_id: "co_storeStatusTest02",
      shopify_order_id: SHOPIFY_ID,
      shopify_checkout_id: null,
      shopify_order_number: ORDER_NUMBER,
      buyer_email_hash: await emailHash(),
      profile_id: null,
      artifact_intent_ids_json: "[]",
      print_order_ids_json: "[]",
      status: "processing",
      hold_reason: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };

    const res = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/order-status?order=${ORDER_NUMBER}&email=wrong@example.com`
      ),
      dbFor(commerce)
    );
    expect(res.status).toBe(404);
  });
});

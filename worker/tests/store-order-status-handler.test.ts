import { describe, expect, it } from "vitest";

import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handleGetStoreOrderStatus } from "../src/store/store-order-status-handler";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_Hc9mP2nQ4rT6vW8yZ1";
const COMMERCE = "co_storeStatusTest1234";

type State = {
  commerce: Map<string, CommerceOrderRow>;
  printOrders: Map<string, PrintOrderRow>;
};

function dbFor(state: State): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return [...state.commerce.values()].find((row) => row.shopify_order_id === args[0]) ?? null;
          }
          if (sql.includes("FROM commerce_order_links") && sql.includes("LIKE")) {
            return [...state.commerce.values()].find((row) =>
              row.artifact_intent_ids_json.includes(String(args[0]).slice(2, -2))
            ) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE order_id")) {
            return [...state.printOrders.values()].find((row) => row.order_id === args[0]) ?? null;
          }
          if (sql.includes("FROM artifact_intents")) {
            return null;
          }
          return null;
        },
        all: async () => {
          if (sql.includes("FROM commerce_order_links") && sql.includes("LIKE")) {
            const id = String(args[0]).slice(2, -2);
            const rows = [...state.commerce.values()].filter((row) =>
              row.artifact_intent_ids_json.includes(id)
            );
            return { results: rows };
          }
          return { results: [] };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("GET /v1/store/orders/status", () => {
  it("returns shopper timeline for artifact_intent_id lookup", async () => {
    const state: State = {
      commerce: new Map([
        [
          COMMERCE,
          {
            commerce_order_id: COMMERCE,
            shopify_order_id: "450789469",
            shopify_checkout_id: null,
            profile_id: PROFILE,
            artifact_intent_ids_json: JSON.stringify([INTENT]),
            print_order_ids_json: JSON.stringify(["po_statusTest12345678"]),
            status: "processing",
            hold_reason: null,
            created_at: "2026-05-16T17:00:00Z",
            updated_at: "2026-05-16T18:00:00Z",
          },
        ],
      ]),
      printOrders: new Map([
        [
          COMMERCE,
          {
            order_id: "po_statusTest12345678",
            profile_id: PROFILE,
            print_artifact_ids_json: "[]",
            planned_item_qr_ids_json: '["qr_planned1"]',
            commerce_order_id: COMMERCE,
            shopify_order_id: "450789469",
            printify_order_id: null,
            printify_shop_id: null,
            template_id: "hc-sticker-square-v1",
            status: "submitted",
            shipping_method: "standard",
            created_at: "2026-05-16T17:00:00Z",
            updated_at: "2026-05-16T18:00:00Z",
          },
        ],
      ]),
    };

    const res = await handleGetStoreOrderStatus(
      new Request(`https://humanity.llc/v1/store/orders/status?artifact_intent_id=${INTENT}`),
      dbFor(state)
    );
    const json = (await res.json()) as {
      fulfillment_mode: string;
      timeline: { id: string }[];
      print_status_label: string;
    };

    expect(res.status).toBe(200);
    expect(json.fulfillment_mode).toBe("personalized");
    expect(json.print_status_label).toBe("Sent to print partner");
    expect(json.timeline.length).toBeGreaterThan(0);
  });

  it("returns 404 when lookup misses", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request("https://humanity.llc/v1/store/orders/status?artifact_intent_id=ai_NotFound123456789"),
      dbFor({ commerce: new Map(), printOrders: new Map() })
    );
    expect(res.status).toBe(404);
  });
});

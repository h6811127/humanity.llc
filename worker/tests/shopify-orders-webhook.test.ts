import { describe, expect, it } from "vitest";

import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handlePostShopifyOrdersWebhook } from "../src/http/shopify-orders-webhook";
import type { Env } from "../src/env";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_PaidWebhookTest01";
const SECRET = "shpss_webhook_test_secret";

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function intentRow(overrides: Partial<ArtifactIntentRow> = {}): ArtifactIntentRow {
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "prod_sticker_square",
    quantity: 1,
    planned_item_qr_ids_json: JSON.stringify(["qr_planned1"]),
    planned_print_artifact_ids_json: JSON.stringify(["pa_planned1"]),
    status: "attached_to_cart",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

type DbState = {
  intents: Map<string, ArtifactIntentRow>;
  orders: Map<string, CommerceOrderRow>;
  receipts: Map<string, { webhook_id: string; commerce_order_id: string | null }>;
  printOrders: Map<string, PrintOrderRow>;
};

function dbFor(state: DbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM artifact_intents")) {
            return state.intents.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return state.orders.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM shopify_webhook_receipts")) {
            return state.receipts.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO commerce_order_links")) {
            const row: CommerceOrderRow = {
              commerce_order_id: args[0] as string,
              shopify_order_id: args[1] as string,
              shopify_checkout_id: args[2] as string | null,
              shopify_order_number: args[3] as number | null,
              buyer_email_hash: args[4] as string | null,
              profile_id: args[5] as string | null,
              artifact_intent_ids_json: args[6] as string,
              print_order_ids_json: "[]",
              status: args[7] as CommerceOrderRow["status"],
              hold_reason: args[8] as string | null,
              created_at: args[9] as string,
              updated_at: args[10] as string,
            };
            state.orders.set(row.shopify_order_id, row);
          }
          if (sql.includes("UPDATE artifact_intents")) {
            const id = args[2] as string;
            const existing = state.intents.get(id);
            if (existing) {
              state.intents.set(id, {
                ...existing,
                status: args[0] as ArtifactIntentRow["status"],
                updated_at: args[1] as string,
              });
            }
          }
          if (sql.includes("UPDATE commerce_order_links") && sql.includes("print_order_ids_json")) {
            const printOrderIds = JSON.parse(args[0] as string) as string[];
            const commerceOrderId = args[2] as string;
            for (const [key, order] of state.orders) {
              if (order.commerce_order_id === commerceOrderId) {
                state.orders.set(key, {
                  ...order,
                  print_order_ids_json: JSON.stringify(printOrderIds),
                  updated_at: args[1] as string,
                });
              }
            }
          } else if (sql.includes("UPDATE commerce_order_links")) {
            for (const [key, order] of state.orders) {
              if (order.commerce_order_id === args[3]) {
                state.orders.set(key, {
                  ...order,
                  status: args[0] as CommerceOrderRow["status"],
                  hold_reason: args[1] as string | null,
                  updated_at: args[2] as string,
                });
              }
            }
          }
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
              status: args[7] as PrintOrderRow["status"],
              shipping_method: args[8] as string,
              created_at: args[9] as string,
              updated_at: args[10] as string,
            };
            state.printOrders.set(row.commerce_order_id, row);
          }
          if (sql.includes("INSERT INTO shopify_webhook_receipts")) {
            state.receipts.set(args[0] as string, {
              webhook_id: args[0] as string,
              commerce_order_id: args[3] as string | null,
            });
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

function paidOrderBody(overrides: Record<string, unknown> = {}) {
  return {
    id: 450789469,
    checkout_id: 901414060,
    financial_status: "paid",
    email: "buyer@example.com",
    order_number: 1001,
    name: "#1001",
    line_items: [
      {
        properties: [
          { name: "artifact_intent_id", value: INTENT },
          { name: "profile_id", value: PROFILE },
        ],
      },
    ],
    ...overrides,
  };
}

async function webhookRequest(body: unknown, headers: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  const hmac = await signPayload(payload);
  return new Request("https://humanity.llc/v1/webhooks/shopify/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Topic": "orders/paid",
      "X-Shopify-Webhook-Id": "wh_123",
      ...headers,
    },
    body: payload,
  });
}

const env = { SHOPIFY_WEBHOOK_SECRET: SECRET } as Env;

const TIER0_CAMPAIGN = "nSVXWPqgRFEhGPjxyRzidF6";
const TIER0_VARIANT = "12345678";
const tier0Env = {
  ...env,
  TIER0_CAMPAIGN_PROFILE_ID: TIER0_CAMPAIGN,
  TIER0_SHOPIFY_VARIANT_IDS: TIER0_VARIANT,
} as Env;

describe("Shopify orders webhook (O-001)", () => {
  it("creates processing commerce order and converts intent", async () => {
    const state: DbState = {
      intents: new Map([[INTENT, intentRow()]]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };

    const res = await handlePostShopifyOrdersWebhook(
      await webhookRequest(paidOrderBody()),
      env,
      dbFor(state)
    );
    const json = (await res.json()) as {
      status: string;
      artifact_intent_ids: string[];
      hold_reason: string | null;
      duplicate: boolean;
      print_order_ids: string[];
    };

    expect(res.status).toBe(200);
    expect(json.status).toBe("processing");
    expect(json.artifact_intent_ids).toEqual([INTENT]);
    expect(json.hold_reason).toBeNull();
    expect(json.duplicate).toBe(false);
    expect(json.print_order_ids).toHaveLength(1);
    expect(json.print_order_ids[0]).toMatch(/^po_/);
    expect(state.intents.get(INTENT)?.status).toBe("converted");
    expect(state.orders.size).toBe(1);

    const printOrder = [...state.printOrders.values()][0];
    expect(printOrder?.template_id).toBe("hc-sticker-square-v1");
    expect(JSON.parse(printOrder!.planned_item_qr_ids_json)).toEqual(["qr_planned1"]);
  });

  it("queues personalized sticker print order for storefront product id", async () => {
    const state: DbState = {
      intents: new Map([
        [
          INTENT,
          intentRow({ product_id: "sticker_personalized_v1" }),
        ],
      ]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };

    const res = await handlePostShopifyOrdersWebhook(
      await webhookRequest(paidOrderBody()),
      env,
      dbFor(state)
    );
    const json = (await res.json()) as { fulfillment_mode: string; print_order_ids: string[] };

    expect(res.status).toBe(200);
    expect(json.fulfillment_mode).toBe("personalized");
    expect(json.print_order_ids).toHaveLength(1);

    const printOrder = [...state.printOrders.values()][0];
    expect(printOrder?.template_id).toBe("hc-sticker-square-v1");
  });

  it("holds order when artifact intent metadata is missing", async () => {
    const state: DbState = {
      intents: new Map(),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };

    const res = await handlePostShopifyOrdersWebhook(
      await webhookRequest(paidOrderBody({ line_items: [] })),
      env,
      dbFor(state)
    );
    const json = (await res.json()) as { status: string; hold_reason: string };
    expect(res.status).toBe(200);
    expect(json.status).toBe("held_for_review");
    expect(json.hold_reason).toBe("CHECKOUT_METADATA_MISSING");
  });

  it("queues tier0 batch print order when variant matches operator config", async () => {
    const state: DbState = {
      intents: new Map(),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };

    const res = await handlePostShopifyOrdersWebhook(
      await webhookRequest(
        paidOrderBody({
          line_items: [{ variant_id: Number(TIER0_VARIANT), quantity: 1 }],
        })
      ),
      tier0Env,
      dbFor(state)
    );
    const json = (await res.json()) as {
      status: string;
      hold_reason: string | null;
      fulfillment_mode: string;
      profile_id: string;
      print_order_ids: string[];
    };

    expect(res.status).toBe(200);
    expect(json.status).toBe("processing");
    expect(json.hold_reason).toBeNull();
    expect(json.fulfillment_mode).toBe("tier0_batch");
    expect(json.profile_id).toBe(TIER0_CAMPAIGN);
    expect(json.print_order_ids).toHaveLength(1);

    const printOrder = [...state.printOrders.values()][0];
    expect(printOrder?.template_id).toBe("hc-tier0-sticker-batch-v1");
    expect(JSON.parse(printOrder!.planned_item_qr_ids_json)).toEqual([]);
  });

  it("is idempotent for duplicate paid webhooks", async () => {
    const state: DbState = {
      intents: new Map([[INTENT, intentRow()]]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };
    const db = dbFor(state);

    const req1 = await webhookRequest(paidOrderBody());
    await handlePostShopifyOrdersWebhook(req1, env, db);

    const req2 = await webhookRequest(paidOrderBody(), { "X-Shopify-Webhook-Id": "wh_123" });
    const res2 = await handlePostShopifyOrdersWebhook(req2, env, db);
    const json2 = (await res2.json()) as { duplicate: boolean };

    expect(json2.duplicate).toBe(true);
    expect(state.orders.size).toBe(1);
  });

  it("rejects invalid HMAC", async () => {
    const req = new Request("https://humanity.llc/v1/webhooks/shopify/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": "invalid",
        "X-Shopify-Topic": "orders/paid",
      },
      body: "{}",
    });
    const res = await handlePostShopifyOrdersWebhook(req, env, dbFor({
      intents: new Map(),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    }));
    expect(res.status).toBe(401);
  });
});

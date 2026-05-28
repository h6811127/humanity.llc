import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { mintPrintOrderFromCredentials } from "../src/commerce/fulfillment-mint";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handlePostShopifyOrdersWebhook } from "../src/http/shopify-orders-webhook";
import type { Env } from "../src/env";
import { HOODIE_LIVE_OBJECT_TEMPLATE_ID } from "../src/print/print-catalog";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_MerchFunnelMint01";
const PLANNED_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PLANNED_PA = "pa_testMerchMint919";
const SECRET = "shpss_merch_funnel_mint";

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

type DbState = {
  intents: Map<string, ArtifactIntentRow>;
  orders: Map<string, CommerceOrderRow>;
  receipts: Map<string, { webhook_id: string; commerce_order_id: string | null }>;
  printOrders: Map<string, PrintOrderRow>;
};

function intentRow(): ArtifactIntentRow {
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "hoodie_live_object_v1",
    quantity: 1,
    planned_item_qr_ids_json: JSON.stringify([PLANNED_QR]),
    planned_print_artifact_ids_json: JSON.stringify([PLANNED_PA]),
    status: "attached_to_cart",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function dbFor(state: DbState, cardPublicKey: string): D1Database {
  const activeByPa = new Map<string, string>();

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
          if (sql.includes("FROM cards WHERE profile_id = ?")) {
            return {
              public_key: cardPublicKey,
              recovery_public_key: null,
              handle: "river_example",
              handle_normalized: "river_example",
              manifesto_line: "Open studio",
              status: "active",
              card_document_json: "{}",
              created_at: "2026-05-16T17:00:00Z",
              updated_at: "2026-05-16T17:00:00Z",
            };
          }
          if (sql.includes("issuer_public_key")) {
            return {
              public_key: cardPublicKey,
              recovery_public_key: null,
              issuer_public_key: null,
              status: "active",
            };
          }
          if (sql.includes("print_artifact_id = ?")) {
            const paId = args[1] as string;
            const qrId = activeByPa.get(paId);
            return qrId ? { qr_id: qrId, print_artifact_id: paId } : null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO qr_credentials")) {
            activeByPa.set(args[3] as string, args[0] as string);
            return { success: true };
          }
          if (sql.includes("INSERT INTO commerce_order_links")) {
            const row: CommerceOrderRow = {
              commerce_order_id: args[0] as string,
              shopify_order_id: args[1] as string,
              shopify_checkout_id: args[2] as string | null,
              profile_id: args[3] as string | null,
              artifact_intent_ids_json: args[4] as string,
              print_order_ids_json: "[]",
              status: args[6] as CommerceOrderRow["status"],
              hold_reason: args[7] as string | null,
              created_at: args[8] as string,
              updated_at: args[9] as string,
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
          if (sql.includes("INSERT INTO qr_credentials")) {
            return { success: true };
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

const env = { SHOPIFY_WEBHOOK_SECRET: SECRET } as Env;

describe("merch funnel paid → mint path", () => {
  it("queues personalized print order after paid webhook, then mints planned QRs", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const state: DbState = {
      intents: new Map([[INTENT, intentRow()]]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };
    const db = dbFor(state, publicKeyBase58);

    const payload = JSON.stringify({
      id: 450789470,
      checkout_id: 901414061,
      financial_status: "paid",
      line_items: [
        {
          properties: [
            { name: "artifact_intent_id", value: INTENT },
            { name: "profile_id", value: PROFILE },
          ],
        },
      ],
    });
    const hmac = await signPayload(payload);
    const webhookRes = await handlePostShopifyOrdersWebhook(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": hmac,
          "X-Shopify-Topic": "orders/paid",
          "X-Shopify-Webhook-Id": "wh_merch_mint_1",
        },
        body: payload,
      }),
      env,
      db
    );

    const webhookJson = (await webhookRes.json()) as {
      fulfillment_mode: string;
      print_order_ids: string[];
    };
    expect(webhookJson.fulfillment_mode).toBe("personalized");
    expect(webhookJson.print_order_ids).toHaveLength(1);

    const printOrder = [...state.printOrders.values()][0]!;
    expect(printOrder.template_id).toBe(HOODIE_LIVE_OBJECT_TEMPLATE_ID);
    expect(JSON.parse(printOrder.planned_item_qr_ids_json)).toEqual([PLANNED_QR]);

    const credential = await signDocument(
      withProtocolFields(
        {
          qr_id: PLANNED_QR,
          profile_id: PROFILE,
          nonce: "nonce_merchMintPath1",
          epoch: 1,
          scope: "print_artifact",
          print_artifact_id: PLANNED_PA,
          resolver_hint: "https://humanity.llc",
          issued_at: "2026-05-16T17:00:00.000Z",
          expires_at: null,
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${PLANNED_QR}`,
        },
        PAYLOAD_TYPES.QR_CREDENTIAL
      ),
      { privateKey, publicKeyBase58 }
    );

    const mintResult = await mintPrintOrderFromCredentials(
      new Request(`https://humanity.llc/v1/print/orders/${printOrder.order_id}/mint`),
      db,
      printOrder,
      [credential]
    );

    expect(mintResult.ok).toBe(true);
    if (!mintResult.ok) return;
    expect(mintResult.all_planned_minted).toBe(true);
    expect(mintResult.minted[0]?.qr_id).toBe(PLANNED_QR);
  });
});

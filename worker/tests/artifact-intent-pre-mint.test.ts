import { describe, expect, it, vi, afterEach } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { handlePostArtifactIntentPreMint } from "../src/resolver/artifact-intents";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import { handlePostShopifyOrdersWebhook } from "../src/http/shopify-orders-webhook";
import type { Env } from "../src/env";
import { HOODIE_LIVE_OBJECT_TEMPLATE_ID } from "../src/print/print-catalog";
import * as printifySubmit from "../src/print/print-order-printify-submit";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_PreMintAutoMint01";
const PLANNED_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PLANNED_PA = "pa_testPreMintAuto919";
const SECRET = "shpss_pre_mint_auto_mint";

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

async function buildPrintArtifactCredential(
  privateKey: CryptoKey,
  publicKeyBase58: string
) {
  return signDocument(
    withProtocolFields(
      {
        qr_id: PLANNED_QR,
        profile_id: PROFILE,
        nonce: "nonce_preMintAutoMint1",
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
}

function intentRow(pendingMint: string | null = null): ArtifactIntentRow {
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "hoodie_live_object_v1",
    quantity: 1,
    planned_item_qr_ids_json: JSON.stringify([PLANNED_QR]),
    planned_print_artifact_ids_json: JSON.stringify([PLANNED_PA]),
    pending_mint_credentials_json: pendingMint,
    status: "attached_to_cart",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

type DbState = {
  intents: Map<string, ArtifactIntentRow>;
  orders: Map<string, unknown>;
  receipts: Map<string, unknown>;
  printOrders: Map<string, unknown>;
};

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
          if (sql.includes("FROM print_orders WHERE order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            for (const row of state.printOrders.values()) {
              if ((row as { commerce_order_id: string }).commerce_order_id === args[0]) {
                return row;
              }
            }
            return null;
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
          if (sql.includes("planned_item_qr_ids_json")) {
            for (const row of state.printOrders.values()) {
              const printOrder = row as { planned_item_qr_ids_json: string };
              const qrIds = JSON.parse(printOrder.planned_item_qr_ids_json) as string[];
              if (qrIds.includes(args[0] as string)) {
                return { qr_id: args[0], status: "active" };
              }
            }
            return null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE artifact_intents") && sql.includes("pending_mint_credentials_json")) {
            const existing = state.intents.get(args[2] as string);
            if (existing) {
              state.intents.set(args[2] as string, {
                ...existing,
                pending_mint_credentials_json: args[0] as string,
                updated_at: args[1] as string,
              });
            }
          }
          if (sql.includes("UPDATE artifact_intents SET status")) {
            const existing = state.intents.get(args[2] as string);
            if (existing) {
              state.intents.set(args[2] as string, {
                ...existing,
                status: args[0] as ArtifactIntentRow["status"],
                updated_at: args[1] as string,
              });
            }
          }
          if (sql.includes("INSERT INTO qr_credentials")) {
            activeByPa.set(args[3] as string, args[0] as string);
          }
          if (sql.includes("INSERT INTO commerce_order_links")) {
            state.orders.set(args[1] as string, {
              commerce_order_id: args[0],
              shopify_order_id: args[1],
              artifact_intent_ids_json: args[4],
              print_order_ids_json: "[]",
              status: args[6],
              profile_id: args[3],
            });
          }
          if (sql.includes("INSERT INTO print_orders")) {
            const row = {
              order_id: args[0],
              profile_id: args[1],
              print_artifact_ids_json: args[2],
              planned_item_qr_ids_json: args[3],
              commerce_order_id: args[4],
              shopify_order_id: args[5],
              template_id: args[6],
              status: args[7],
              printify_order_id: null,
              printify_shop_id: null,
              shipping_method: args[8],
              created_at: args[9],
              updated_at: args[10],
            };
            state.printOrders.set(args[0] as string, row);
          }
          if (sql.includes("UPDATE commerce_order_links") && sql.includes("print_order_ids_json")) {
            for (const [key, order] of state.orders) {
              if ((order as { commerce_order_id: string }).commerce_order_id === args[2]) {
                state.orders.set(key, {
                  ...(order as object),
                  print_order_ids_json: args[0],
                });
              }
            }
          }
          if (sql.includes("INSERT INTO shopify_webhook_receipts")) {
            state.receipts.set(args[0] as string, { webhook_id: args[0] });
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

const env = { SHOPIFY_WEBHOOK_SECRET: SECRET } as Env;

describe("artifact intent pre-mint + paid webhook auto-mint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores pre-mint credentials then auto-mints after paid webhook", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const credential = await buildPrintArtifactCredential(privateKey, publicKeyBase58);
    const state: DbState = {
      intents: new Map([[INTENT, intentRow()]]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };
    const db = dbFor(state, publicKeyBase58);

    const preMintRes = await handlePostArtifactIntentPreMint(
      new Request(`https://humanity.llc/v1/store/artifact-intents/${INTENT}/pre-mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_credentials: [credential] }),
      }),
      db,
      INTENT
    );
    expect(preMintRes.status).toBe(200);
    expect(state.intents.get(INTENT)?.pending_mint_credentials_json).toBeTruthy();

    const payload = JSON.stringify({
      id: 450789471,
      checkout_id: 901414062,
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
          "X-Shopify-Webhook-Id": "wh_pre_mint_auto_1",
        },
        body: payload,
      }),
      env,
      db
    );

    const webhookJson = (await webhookRes.json()) as {
      fulfillment_mode: string;
      auto_mint: { attempted: boolean; all_planned_minted: boolean }[];
    };
    expect(webhookJson.fulfillment_mode).toBe("personalized");
    expect(webhookJson.auto_mint[0]?.attempted).toBe(true);
    expect(webhookJson.auto_mint[0]?.all_planned_minted).toBe(true);

    const printOrder = [...state.printOrders.values()][0] as {
      template_id: string;
      planned_item_qr_ids_json: string;
    };
    expect(printOrder.template_id).toBe(HOODIE_LIVE_OBJECT_TEMPLATE_ID);
    expect(JSON.parse(printOrder.planned_item_qr_ids_json)).toEqual([PLANNED_QR]);
  });

  it("auto-submits to Printify after mint when PRINTIFY_SUBMIT_ENABLED=1", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const credential = await buildPrintArtifactCredential(privateKey, publicKeyBase58);
    const state: DbState = {
      intents: new Map([[INTENT, intentRow()]]),
      orders: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
    };
    const db = dbFor(state, publicKeyBase58);
    const submitSpy = vi.spyOn(printifySubmit, "submitPrintOrderToPrintify").mockResolvedValue({
      ok: true,
      printOrder: {
        order_id: "po_autoSubmitFromWebhook",
        profile_id: PROFILE,
        print_artifact_ids_json: JSON.stringify([PLANNED_PA]),
        planned_item_qr_ids_json: JSON.stringify([PLANNED_QR]),
        commerce_order_id: "co_autoSubmitFromWebhook",
        shopify_order_id: "450789473",
        printify_order_id: "pf_autoSubmitFromWebhook",
        printify_shop_id: 99,
        template_id: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
        status: "submitted",
        shipping_method: "standard",
        created_at: "2026-05-16T17:00:00Z",
        updated_at: "2026-05-16T17:00:00Z",
      },
    });

    await handlePostArtifactIntentPreMint(
      new Request(`https://humanity.llc/v1/store/artifact-intents/${INTENT}/pre-mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_credentials: [credential] }),
      }),
      db,
      INTENT
    );

    const payload = JSON.stringify({
      id: 450789473,
      checkout_id: 901414063,
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
          "X-Shopify-Webhook-Id": "wh_pre_mint_auto_submit_1",
        },
        body: payload,
      }),
      { ...env, PRINTIFY_SUBMIT_ENABLED: "1" },
      db
    );

    const webhookJson = (await webhookRes.json()) as {
      auto_mint: {
        all_planned_minted: boolean;
        printify_submit: { attempted: boolean; submitted: boolean };
      }[];
    };
    expect(webhookJson.auto_mint[0]?.all_planned_minted).toBe(true);
    expect(webhookJson.auto_mint[0]?.printify_submit).toEqual({
      attempted: true,
      submitted: true,
      skipped: false,
    });
    expect(submitSpy).toHaveBeenCalledOnce();
  });
});

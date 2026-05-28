import { describe, expect, it } from "vitest";

import { mintPrintOrderFromCredentials } from "../src/commerce/fulfillment-mint";
import { getPlannedMintStatus } from "../src/commerce/fulfillment-mint";
import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handlePostShopifyOrdersWebhook } from "../src/http/shopify-orders-webhook";
import { resolvePrintTemplateForStoreProductId } from "../src/print/print-catalog";
import {
  handlePostArtifactIntent,
  handlePostArtifactIntentAttach,
} from "../src/resolver/artifact-intents";
import { handleGetStoreOrderStatus } from "../src/store/store-order-status-handler";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const SOURCE_QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const SHOPIFY_ORDER_ID = "450789469";
const WEBHOOK_SECRET = "shpss_merch_paid_path_test";
const CREATED = "2026-05-16T17:00:00.000Z";

type TestEnv = { SHOPIFY_WEBHOOK_SECRET?: string };

function card(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function sourceQr(): QrCredentialRow {
  return {
    qr_id: SOURCE_QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${SOURCE_QR}`,
    issued_at: CREATED,
    expires_at: "2099-01-01T00:00:00Z",
    credential_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function summary(): VerificationSummaryRow {
  return {
    profile_id: PROFILE,
    state: "registered",
    level: 1,
    label: "Registered",
    method: "registered",
    vouch_count: 0,
    latest_accepted_vouch_at: null,
    credential_ids_json: "[]",
    summary_document_json: null,
    updated_at: CREATED,
  };
}

type DbState = {
  card: CardRow;
  qr: QrCredentialRow;
  verification: VerificationSummaryRow;
  publicKeyBase58: string;
  intents: Map<string, ArtifactIntentRow>;
  commerce: Map<string, CommerceOrderRow>;
  commerceByShopify: Map<string, CommerceOrderRow>;
  receipts: Map<string, { webhook_id: string; commerce_order_id: string | null }>;
  printOrders: Map<string, PrintOrderRow>;
  printOrdersByCommerce: Map<string, PrintOrderRow>;
  mintedQrByPa: Map<string, string>;
  mintedQrRows: Map<string, QrCredentialRow>;
};

function createDb(state: DbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards WHERE profile_id") && sql.includes("manifesto_line")) {
            return {
              public_key: state.publicKeyBase58,
              recovery_public_key: null,
              handle: state.card.handle,
              handle_normalized: state.card.handle_normalized,
              manifesto_line: state.card.manifesto_line,
              status: state.card.status,
              card_document_json: state.card.card_document_json,
              created_at: state.card.created_at,
              updated_at: state.card.updated_at,
            };
          }
          if (sql.includes("FROM cards")) return state.card;
          if (sql.includes("FROM qr_credentials") && sql.includes("print_artifact_id = ?")) {
            const paId = args[1] as string;
            const qrId = state.mintedQrByPa.get(paId);
            return qrId ? { qr_id: qrId, print_artifact_id: paId } : null;
          }
          if (sql.includes("FROM qr_credentials")) return state.qr;
          if (sql.includes("FROM verification_summaries")) return state.verification;
          if (sql.includes("FROM artifact_intents")) {
            return state.intents.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return state.commerceByShopify.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM commerce_order_links WHERE commerce_order_id")) {
            return state.commerce.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM commerce_order_links") && sql.includes("LIKE")) {
            const pattern = String(args[0]);
            return (
              [...state.commerce.values()].find((row) =>
                pattern.includes(row.artifact_intent_ids_json.slice(1, -1).split('"')[1] ?? "")
              ) ?? null
            );
          }
          if (sql.includes("FROM shopify_webhook_receipts")) {
            return state.receipts.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return state.printOrdersByCommerce.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          if (sql.includes("issuer_public_key")) {
            return {
              public_key: state.publicKeyBase58,
              recovery_public_key: null,
              issuer_public_key: null,
              status: "active",
            };
          }
          return null;
        },
        all: async () => {
          if (sql.includes("FROM commerce_order_links") && sql.includes("LIKE")) {
            const pattern = String(args[0]);
            const rows = [...state.commerce.values()].filter((row) =>
              (row.artifact_intent_ids_json ?? "").includes(
                pattern.replace(/%/g, "").replace(/"/g, "")
              )
            );
            return { results: rows };
          }
          return { results: [] };
        },
        run: async () => {
          if (sql.includes("INSERT INTO artifact_intents")) {
            const row: ArtifactIntentRow = {
              artifact_intent_id: args[0] as string,
              profile_id: args[1] as string,
              source_qr_id: args[2] as string,
              product_id: args[3] as string | null,
              quantity: args[4] as number,
              planned_item_qr_ids_json: args[5] as string,
              planned_print_artifact_ids_json: args[6] as string,
              status: args[7] as ArtifactIntentRow["status"],
              expires_at: args[8] as string,
              created_at: args[9] as string,
              updated_at: args[10] as string,
            };
            state.intents.set(row.artifact_intent_id, row);
          }
          if (sql.includes("UPDATE artifact_intents")) {
            const existing = state.intents.get(args[2] as string);
            if (existing) {
              state.intents.set(args[2] as string, {
                ...existing,
                status: args[0] as ArtifactIntentRow["status"],
                updated_at: args[1] as string,
              });
            }
          }
          if (sql.includes("INSERT INTO commerce_order_links")) {
            const row: CommerceOrderRow = {
              commerce_order_id: args[0] as string,
              shopify_order_id: args[1] as string,
              shopify_checkout_id: args[2] as string | null,
              shopify_order_number: (args[3] as string | null) ?? null,
              buyer_email_hash: (args[4] as string | null) ?? null,
              profile_id: (args[5] as string | null) ?? null,
              artifact_intent_ids_json: args[6] as string,
              print_order_ids_json: "[]",
              status: args[7] as CommerceOrderRow["status"],
              hold_reason: (args[8] as string | null) ?? null,
              created_at: args[9] as string,
              updated_at: args[10] as string,
            };
            state.commerce.set(row.commerce_order_id, row);
            state.commerceByShopify.set(row.shopify_order_id, row);
          }
          if (sql.includes("UPDATE commerce_order_links") && sql.includes("print_order_ids_json")) {
            const commerceOrderId = args[2] as string;
            const existing = state.commerce.get(commerceOrderId);
            if (existing) {
              const updated = {
                ...existing,
                print_order_ids_json: args[0] as string,
                updated_at: args[1] as string,
              };
              state.commerce.set(commerceOrderId, updated);
              state.commerceByShopify.set(updated.shopify_order_id, updated);
            }
          } else if (sql.includes("UPDATE commerce_order_links")) {
            for (const [key, order] of state.commerce) {
              if (order.commerce_order_id === args[3]) {
                const updated = {
                  ...order,
                  status: args[0] as CommerceOrderRow["status"],
                  hold_reason: args[1] as string | null,
                  updated_at: args[2] as string,
                };
                state.commerce.set(key, updated);
                state.commerceByShopify.set(updated.shopify_order_id, updated);
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
            state.printOrders.set(row.order_id, row);
            state.printOrdersByCommerce.set(row.commerce_order_id, row);
          }
          if (sql.includes("INSERT INTO shopify_webhook_receipts")) {
            state.receipts.set(args[0] as string, {
              webhook_id: args[0] as string,
              commerce_order_id: args[3] as string | null,
            });
          }
          if (sql.includes("INSERT INTO qr_credentials")) {
            const qrId = args[0] as string;
            const paId = args[3] as string;
            state.mintedQrByPa.set(paId, qrId);
            state.mintedQrRows.set(qrId, {
              qr_id: qrId,
              profile_id: args[1] as string,
              epoch: 1,
              scope: "print_artifact",
              print_artifact_id: paId,
              resolver_hint: "https://humanity.llc",
              status: "active",
              payload: args[7] as string,
              issued_at: CREATED,
              expires_at: null,
              credential_document_json: "{}",
              created_at: CREATED,
              updated_at: CREATED,
            });
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function signedPlannedCredential(
  publicKeyBase58: string,
  privateKey: Uint8Array,
  qrId: string,
  printArtifactId: string
) {
  const payload = `https://humanity.llc/c/${PROFILE}?q=${qrId}`;
  return signDocument(
    withProtocolFields(
      {
        qr_id: qrId,
        profile_id: PROFILE,
        nonce: `nonce_${qrId.slice(-8)}`,
        epoch: 1,
        scope: "print_artifact",
        print_artifact_id: printArtifactId,
        resolver_hint: "https://humanity.llc",
        issued_at: CREATED,
        expires_at: null,
        status: "active",
        payload,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );
}

describe("merch funnel paid personalized path (close-out)", () => {
  it("chains intent → attach → paid webhook → mint → order status", async () => {
    expect(typeof resolvePrintTemplateForStoreProductId).toBe("function");
    expect(resolvePrintTemplateForStoreProductId("sticker_personalized_v1")).toBe(
      "hc-sticker-square-v1"
    );

    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const state: DbState = {
      card: card(),
      qr: sourceQr(),
      verification: summary(),
      publicKeyBase58,
      intents: new Map(),
      commerce: new Map(),
      commerceByShopify: new Map(),
      receipts: new Map(),
      printOrders: new Map(),
      printOrdersByCommerce: new Map(),
      mintedQrByPa: new Map(),
      mintedQrRows: new Map(),
    };
    const db = createDb(state);
    const env = { SHOPIFY_WEBHOOK_SECRET: WEBHOOK_SECRET } as TestEnv;

    const intentRes = await handlePostArtifactIntent(
      new Request("https://humanity.llc/v1/store/artifact-intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          source_qr_id: SOURCE_QR,
          product_id: "sticker_personalized_v1",
          quantity: 1,
        }),
      }),
      db
    );
    expect(intentRes.status).toBe(201);
    const intentJson = (await intentRes.json()) as {
      artifact_intent_id: string;
      planned_item_qr_ids: string[];
      planned_print_artifact_ids: string[];
    };
    const intentId = intentJson.artifact_intent_id;
    expect(intentId).toMatch(/^ai_/);
    expect(intentJson.planned_item_qr_ids).toHaveLength(1);

    const attachRes = await handlePostArtifactIntentAttach(
      new Request(`https://humanity.llc/v1/store/artifact-intents/${intentId}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_acknowledged: true,
          shopify_variant_id: "12345678901234",
        }),
      }),
      db,
      intentId
    );
    expect(attachRes.status).toBe(200);
    const attachJson = (await attachRes.json()) as {
      status: string;
      shopify: { cart_line_attributes: { key: string; value: string }[] };
    };
    expect(attachJson.status).toBe("attached_to_cart");
    expect(attachJson.shopify.cart_line_attributes).toEqual(
      expect.arrayContaining([{ key: "artifact_intent_id", value: intentId }])
    );

    const paidBody = {
      id: Number(SHOPIFY_ORDER_ID),
      checkout_id: 901414060,
      financial_status: "paid",
      line_items: [
        {
          properties: attachJson.shopify.cart_line_attributes.map((attr) => ({
            name: attr.key,
            value: attr.value,
          })),
        },
      ],
    };
    const payload = JSON.stringify(paidBody);
    const webhookRes = await handlePostShopifyOrdersWebhook(
      new Request("https://humanity.llc/v1/webhooks/shopify/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": await signPayload(payload),
          "X-Shopify-Topic": "orders/paid",
          "X-Shopify-Webhook-Id": "wh_merch_paid_path",
        },
        body: payload,
      }),
      env,
      db
    );
    expect(webhookRes.status).toBe(200);
    const webhookJson = (await webhookRes.json()) as {
      status: string;
      fulfillment_mode: string;
      print_order_ids: string[];
      artifact_intent_ids: string[];
    };
    expect(webhookJson.status).toBe("processing");
    expect(webhookJson.fulfillment_mode).toBe("personalized");
    expect(webhookJson.artifact_intent_ids).toEqual([intentId]);
    expect(webhookJson.print_order_ids).toHaveLength(1);

    const printOrder = state.printOrders.get(webhookJson.print_order_ids[0]!);
    expect(printOrder?.template_id).toBe("hc-sticker-square-v1");
    expect(state.intents.get(intentId)?.status).toBe("converted");

    const plannedQrId = intentJson.planned_item_qr_ids[0]!;
    const plannedPaId = intentJson.planned_print_artifact_ids[0]!;
    const credential = await signedPlannedCredential(
      publicKeyBase58,
      privateKey,
      plannedQrId,
      plannedPaId
    );
    const mintResult = await mintPrintOrderFromCredentials(
      new Request(`https://humanity.llc/v1/print/orders/${printOrder!.order_id}/mint`),
      db,
      printOrder!,
      [credential]
    );
    expect(mintResult.ok).toBe(true);
    if (!mintResult.ok) return;
    expect(mintResult.all_planned_minted).toBe(true);
    expect(mintResult.minted[0]?.qr_id).toBe(plannedQrId);

    const mintStatus = await getPlannedMintStatus(db, printOrder!);
    expect(mintStatus.all_planned_minted).toBe(true);

    const statusRes = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/orders/status?artifact_intent_id=${intentId}`
      ),
      db
    );
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as {
      fulfillment_mode: string;
      print_status_label: string | null;
      timeline: { id: string; state: string }[];
    };
    expect(statusJson.fulfillment_mode).toBe("personalized");
    expect(statusJson.print_status_label).toBe("Awaiting print approval");
    expect(statusJson.timeline.some((step) => step.id === "payment")).toBe(true);
    expect(statusJson.timeline.some((step) => step.id === "print_queued")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import type { ArtifactIntentRow } from "../src/db/artifact-intents";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handleGetOperatorFulfillmentLookup } from "../src/operator/fulfillment-lookup";
import type { Env } from "../src/index";

const TOKEN = "operator-test-token";
const env = { OPERATOR_AUDIT_TOKEN: TOKEN } as Env;

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const INTENT = "ai_LookupTestIntent01";
const COMMERCE = "co_lookupCommerce01";
const PRINT_ORDER = "po_lookupPrintOrder1";
const SHOPIFY = "450789469";

function authRequest(url: string): Request {
  return new Request(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
}

function commerceOrder(): CommerceOrderRow {
  return {
    commerce_order_id: COMMERCE,
    shopify_order_id: SHOPIFY,
    shopify_checkout_id: "901414060",
    shopify_order_number: 1001,
    buyer_email_hash: null,
    profile_id: PROFILE,
    artifact_intent_ids_json: JSON.stringify([INTENT]),
    print_order_ids_json: JSON.stringify([PRINT_ORDER]),
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function intentRow(): ArtifactIntentRow {
  return {
    artifact_intent_id: INTENT,
    profile_id: PROFILE,
    source_qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    product_id: "prod_sticker_square",
    quantity: 1,
    planned_item_qr_ids_json: JSON.stringify(["qr_plannedLookup1"]),
    planned_print_artifact_ids_json: JSON.stringify(["pa_plannedLookup1"]),
    status: "converted",
    expires_at: "2099-01-01T00:00:00Z",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function printOrderRow(): PrintOrderRow {
  return {
    order_id: PRINT_ORDER,
    profile_id: PROFILE,
    print_artifact_ids_json: JSON.stringify(["pa_plannedLookup1"]),
    planned_item_qr_ids_json: JSON.stringify(["qr_plannedLookup1"]),
    commerce_order_id: COMMERCE,
    shopify_order_id: SHOPIFY,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status: "awaiting_production_approval",
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function dbFor(): D1Database {
  const commerce = commerceOrder();
  const intent = intentRow();
  const printOrder = printOrderRow();

  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return args[0] === SHOPIFY ? commerce : null;
          }
          if (sql.includes("FROM commerce_order_links WHERE commerce_order_id")) {
            return args[0] === COMMERCE ? commerce : null;
          }
          if (sql.includes("FROM commerce_order_links") && sql.includes("LIKE")) {
            return args[0] === `%"${INTENT}"%` ? commerce : null;
          }
          if (sql.includes("FROM artifact_intents")) {
            return args[0] === INTENT ? intent : null;
          }
          if (sql.includes("FROM print_orders WHERE order_id")) {
            return args[0] === PRINT_ORDER ? printOrder : null;
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return args[0] === COMMERCE ? printOrder : null;
          }
          if (sql.includes("FROM print_orders WHERE printify_order_id")) {
            return null;
          }
          if (sql.includes("print_artifact_id = ?")) {
            return { qr_id: "qr_plannedLookup1", print_artifact_id: args[1] };
          }
          return null;
        },
        all: async () => ({
          results: sql.includes("LIKE") ? [commerce] : [],
        }),
      }),
    }),
  } as unknown as D1Database;
}

describe("operator fulfillment lookup (O-003)", () => {
  it("returns commerce → intent → print order chain by shopify_order_id", async () => {
    const res = await handleGetOperatorFulfillmentLookup(
      authRequest(`https://humanity.llc/v1/operator/fulfillment/lookup?shopify_order_id=${SHOPIFY}`),
      env,
      dbFor()
    );
    const json = (await res.json()) as {
      commerce_order: { commerce_order_id: string };
      artifact_intents: { artifact_intent_id: string }[];
      print_orders: { order_id: string; mint_status: { all_planned_minted: boolean } }[];
    };
    expect(res.status).toBe(200);
    expect(json.commerce_order.commerce_order_id).toBe(COMMERCE);
    expect(json.artifact_intents[0]?.artifact_intent_id).toBe(INTENT);
    expect(json.print_orders[0]?.order_id).toBe(PRINT_ORDER);
    expect(json.print_orders[0]?.mint_status.all_planned_minted).toBe(true);
  });

  it("rejects lookup without operator token", async () => {
    const res = await handleGetOperatorFulfillmentLookup(
      new Request(`https://humanity.llc/v1/operator/fulfillment/lookup?shopify_order_id=${SHOPIFY}`),
      env,
      dbFor()
    );
    expect(res.status).toBe(401);
  });

  it("requires exactly one lookup parameter", async () => {
    const res = await handleGetOperatorFulfillmentLookup(
      authRequest("https://humanity.llc/v1/operator/fulfillment/lookup"),
      env,
      dbFor()
    );
    expect(res.status).toBe(422);
  });
});

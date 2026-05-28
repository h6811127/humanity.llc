import { describe, expect, it } from "vitest";

import { hashBuyerEmail } from "../src/commerce/buyer-email-hash";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handlePostStoreOrderMint } from "../src/resolver/store-order-mint";

const EMAIL = "buyer@example.com";
const ORDER_NUMBER = 1001;
const SHOPIFY_ID = "450789469";

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
          if (sql.includes("print_artifact_id = ?")) {
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

describe("POST /v1/store/order-mint", () => {
  it("returns 422 when order or email is missing", async () => {
    const res = await handlePostStoreOrderMint(
      new Request("https://humanity.llc/v1/store/order-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_credentials: [{}] }),
      }),
      dbFor(null)
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 when email does not match commerce order", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce: CommerceOrderRow = {
      commerce_order_id: "co_storeMintTest01",
      shopify_order_id: SHOPIFY_ID,
      shopify_checkout_id: null,
      shopify_order_number: ORDER_NUMBER,
      buyer_email_hash: hash,
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      artifact_intent_ids_json: JSON.stringify(["ai_testIntent001"]),
      print_order_ids_json: JSON.stringify(["po_storeMintTest1"]),
      status: "processing",
      hold_reason: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };

    const res = await handlePostStoreOrderMint(
      new Request("https://humanity.llc/v1/store/order-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: String(ORDER_NUMBER),
          email: "wrong@example.com",
          qr_credentials: [{ profile_id: commerce.profile_id }],
        }),
      }),
      dbFor(commerce)
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when order does not require buyer mint", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce: CommerceOrderRow = {
      commerce_order_id: "co_storeMintTier0Inv",
      shopify_order_id: SHOPIFY_ID,
      shopify_checkout_id: null,
      shopify_order_number: ORDER_NUMBER,
      buyer_email_hash: hash,
      profile_id: "nSVXWPqgRFEhGPjxyRzidF6",
      artifact_intent_ids_json: "[]",
      print_order_ids_json: "[]",
      status: "processing",
      hold_reason: null,
      created_at: "2026-05-16T17:00:00Z",
      updated_at: "2026-05-16T17:00:00Z",
    };

    const res = await handlePostStoreOrderMint(
      new Request("https://humanity.llc/v1/store/order-mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: String(ORDER_NUMBER),
          email: EMAIL,
          qr_credentials: [{ profile_id: commerce.profile_id }],
        }),
      }),
      dbFor(commerce, [])
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("MINT_NOT_APPLICABLE");
  });
});

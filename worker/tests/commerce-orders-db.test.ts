import { describe, expect, it } from "vitest";

import {
  findCommerceOrdersByArtifactIntentId,
  getShopifyWebhookReceipt,
  insertShopifyWebhookReceipt,
  type CommerceOrderRow,
} from "../src/db/commerce-orders";

const WEBHOOK_A = "wh_shopifyPaidAa919";
const WEBHOOK_B = "wh_shopifyPaidBb818";
const INTENT_A = "ai_preMintSticker919";
const INTENT_B = "ai_preMintSticker818";
const ORDER_A = "co_shopifyPaidAa919";
const ORDER_B = "co_shopifyPaidBb818";
const NOW = "2026-08-15T10:00:00.000Z";

class FakeCommerceOrderDb {
  orders: CommerceOrderRow[] = [];
  receipts = new Map<
    string,
    { webhook_id: string; commerce_order_id: string | null; topic?: string }
  >();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM shopify_webhook_receipts WHERE webhook_id = ?")) {
              const row = self.receipts.get(String(args[0]));
              return (row
                ? { webhook_id: row.webhook_id, commerce_order_id: row.commerce_order_id }
                : null) as T | null;
            }
            return null;
          },
          async all<T>() {
            if (
              sql.includes("FROM commerce_order_links") &&
              sql.includes("artifact_intent_ids_json LIKE")
            ) {
              const pattern = String(args[0]);
              const needle = pattern.startsWith("%") && pattern.endsWith("%")
                ? pattern.slice(1, -1)
                : pattern;
              return {
                results: self.orders.filter((row) =>
                  row.artifact_intent_ids_json.includes(needle)
                ) as T[],
              };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO shopify_webhook_receipts")) {
              const webhookId = String(args[0]);
              if (self.receipts.has(webhookId)) {
                throw new Error("UNIQUE constraint failed: shopify_webhook_receipts.webhook_id");
              }
              self.receipts.set(webhookId, {
                webhook_id: webhookId,
                topic: String(args[1]),
                commerce_order_id: (args[3] as string | null) ?? null,
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeCommerceOrderDb): D1Database {
  return fake as unknown as D1Database;
}

function order(
  commerceOrderId: string,
  artifactIntentIds: string[]
): CommerceOrderRow {
  return {
    commerce_order_id: commerceOrderId,
    shopify_order_id: `gid://shopify/Order/${commerceOrderId}`,
    shopify_checkout_id: null,
    shopify_order_number: 1001,
    buyer_email_hash: null,
    profile_id: null,
    artifact_intent_ids_json: JSON.stringify(artifactIntentIds),
    print_order_ids_json: "[]",
    status: "paid",
    hold_reason: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

describe("commerce order db helpers", () => {
  it("Shopify webhook receipts are keyed by webhook_id and keep null commerce_order_id", async () => {
    const fake = new FakeCommerceOrderDb();
    await expect(getShopifyWebhookReceipt(db(fake), WEBHOOK_A)).resolves.toBeNull();

    await insertShopifyWebhookReceipt(db(fake), {
      webhook_id: WEBHOOK_A,
      topic: "orders/paid",
      shopify_order_id: "gid://shopify/Order/1",
      commerce_order_id: ORDER_A,
      processed_at: NOW,
    });
    await insertShopifyWebhookReceipt(db(fake), {
      webhook_id: WEBHOOK_B,
      topic: "refunds/create",
      shopify_order_id: null,
      commerce_order_id: null,
      processed_at: NOW,
    });

    await expect(getShopifyWebhookReceipt(db(fake), WEBHOOK_A)).resolves.toEqual({
      webhook_id: WEBHOOK_A,
      commerce_order_id: ORDER_A,
    });
    await expect(getShopifyWebhookReceipt(db(fake), WEBHOOK_B)).resolves.toEqual({
      webhook_id: WEBHOOK_B,
      commerce_order_id: null,
    });
  });

  it("rejects a second Shopify receipt insert for the same webhook_id", async () => {
    const fake = new FakeCommerceOrderDb();
    await insertShopifyWebhookReceipt(db(fake), {
      webhook_id: WEBHOOK_A,
      topic: "orders/paid",
      shopify_order_id: "gid://shopify/Order/1",
      commerce_order_id: ORDER_A,
      processed_at: NOW,
    });
    await expect(
      insertShopifyWebhookReceipt(db(fake), {
        webhook_id: WEBHOOK_A,
        topic: "orders/paid",
        shopify_order_id: "gid://shopify/Order/1",
        commerce_order_id: ORDER_B,
        processed_at: NOW,
      })
    ).rejects.toThrow("UNIQUE constraint failed");
    await expect(getShopifyWebhookReceipt(db(fake), WEBHOOK_A)).resolves.toEqual({
      webhook_id: WEBHOOK_A,
      commerce_order_id: ORDER_A,
    });
  });

  it("finds commerce orders by quoted artifact intent id and ignores prefix/suffix neighbors", async () => {
    const fake = new FakeCommerceOrderDb();
    fake.orders.push(
      order(ORDER_A, [INTENT_A]),
      order(ORDER_B, [INTENT_B, INTENT_A]),
      order("co_prefixNeighbor", [`${INTENT_A}extra`]),
      order("co_suffixNeighbor", [INTENT_A.slice(3)])
    );

    const byA = await findCommerceOrdersByArtifactIntentId(db(fake), INTENT_A);
    const byB = await findCommerceOrdersByArtifactIntentId(db(fake), INTENT_B);
    const byMissing = await findCommerceOrdersByArtifactIntentId(
      db(fake),
      "ai_missingIntent"
    );

    expect(byA.map((row) => row.commerce_order_id).sort()).toEqual([ORDER_A, ORDER_B].sort());
    expect(byB.map((row) => row.commerce_order_id)).toEqual([ORDER_B]);
    expect(byMissing).toEqual([]);
  });
});

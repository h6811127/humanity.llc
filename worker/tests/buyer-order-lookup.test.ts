import { describe, expect, it } from "vitest";

import { hashBuyerEmail } from "../src/commerce/buyer-email-hash";
import {
  lookupBuyerOrder,
  normalizeBuyerOrderRef,
} from "../src/commerce/buyer-order-lookup";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

const EMAIL = "buyer@example.com";
const OTHER_EMAIL = "other@example.com";
const ORDER_NUMBER = 1001;
const SHOPIFY_ID = "450789469";
const COMMERCE_A = "co_buyerLookupA01";
const COMMERCE_B = "co_buyerLookupB01";

function commerceRow(
  overrides: Partial<CommerceOrderRow> = {}
): CommerceOrderRow {
  return {
    commerce_order_id: COMMERCE_A,
    shopify_order_id: SHOPIFY_ID,
    shopify_checkout_id: null,
    shopify_order_number: ORDER_NUMBER,
    buyer_email_hash: null,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    artifact_intent_ids_json: "[]",
    print_order_ids_json: "[]",
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function printRow(
  overrides: Partial<PrintOrderRow> = {}
): PrintOrderRow {
  return {
    order_id: "po_buyerLookupA1",
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: COMMERCE_A,
    shopify_order_id: SHOPIFY_ID,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    print_variant_id: null,
    print_frame_background: "full",
    status: "in_production",
    shipping_method: "standard",
    tracking_carrier: null,
    tracking_number: null,
    tracking_url: null,
    last_reconciled_at: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:10:00Z",
    ...overrides,
  };
}

function dbFor(orders: CommerceOrderRow[], printOrders: PrintOrderRow[]): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return orders.find((row) => row.shopify_order_id === args[0]) ?? null;
          }
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_number")) {
            return (
              orders.find((row) => row.shopify_order_number === args[0]) ?? null
            );
          }
          if (sql.includes("FROM print_orders WHERE commerce_order_id")) {
            return (
              printOrders.find((row) => row.commerce_order_id === args[0]) ?? null
            );
          }
          return null;
        },
        all: async () => ({ results: [] }),
      }),
    }),
  } as unknown as D1Database;
}

describe("normalizeBuyerOrderRef", () => {
  it("strips leading hashes and surrounding whitespace", () => {
    expect(normalizeBuyerOrderRef("1001")).toBe("1001");
    expect(normalizeBuyerOrderRef("#1001")).toBe("1001");
    expect(normalizeBuyerOrderRef("  ##1001  ")).toBe("1001");
    expect(normalizeBuyerOrderRef("###450789469")).toBe("450789469");
  });

  it("returns empty for blank input", () => {
    expect(normalizeBuyerOrderRef("")).toBe("");
    expect(normalizeBuyerOrderRef("   ")).toBe("");
    expect(normalizeBuyerOrderRef("###")).toBe("");
  });
});

describe("lookupBuyerOrder", () => {
  it("returns null for empty order ref or email without querying a match", async () => {
    const db = dbFor([commerceRow()], []);
    await expect(lookupBuyerOrder(db, "   ", EMAIL)).resolves.toBeNull();
    await expect(lookupBuyerOrder(db, "#1001", "  ")).resolves.toBeNull();
  });

  it("matches Shopify id or display order number after hash-stripping", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce = commerceRow({ buyer_email_hash: hash });
    const print = printRow();
    const db = dbFor([commerce], [print]);

    const byNumber = await lookupBuyerOrder(db, "#1001", ` ${EMAIL} `);
    expect(byNumber?.commerce.commerce_order_id).toBe(COMMERCE_A);
    expect(byNumber?.printOrders).toEqual([print]);

    const byShopifyId = await lookupBuyerOrder(db, SHOPIFY_ID, EMAIL);
    expect(byShopifyId?.commerce.shopify_order_id).toBe(SHOPIFY_ID);
  });

  it("returns null when the email hash does not match the stored buyer", async () => {
    const commerce = commerceRow({
      buyer_email_hash: await hashBuyerEmail(EMAIL),
    });
    const db = dbFor([commerce], [printRow()]);
    await expect(lookupBuyerOrder(db, "#1001", OTHER_EMAIL)).resolves.toBeNull();
  });

  it("returns null when the commerce row has no buyer email hash", async () => {
    const db = dbFor([commerceRow({ buyer_email_hash: null })], [printRow()]);
    await expect(lookupBuyerOrder(db, "#1001", EMAIL)).resolves.toBeNull();
  });

  it("does not attach print rows from another commerce order", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce = commerceRow({ buyer_email_hash: hash });
    const otherPrint = printRow({
      order_id: "po_buyerLookupB1",
      commerce_order_id: COMMERCE_B,
      shopify_order_id: "999999999",
    });
    const db = dbFor([commerce], [otherPrint]);
    const lookup = await lookupBuyerOrder(db, "#1001", EMAIL);
    expect(lookup?.commerce.commerce_order_id).toBe(COMMERCE_A);
    expect(lookup?.printOrders).toEqual([]);
  });
});

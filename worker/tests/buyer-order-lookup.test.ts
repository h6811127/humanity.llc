import { describe, expect, it } from "vitest";

import {
  hashBuyerEmail,
  normalizeBuyerEmail,
} from "../src/commerce/buyer-email-hash";
import {
  lookupBuyerOrder,
  normalizeBuyerOrderRef,
} from "../src/commerce/buyer-order-lookup";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

const EMAIL = "Buyer@Example.com";
const NORMALIZED_EMAIL = "buyer@example.com";
const ORDER_NUMBER = 1001;
const SHOPIFY_ID = "450789469";

function commerceRow(emailHash: string): CommerceOrderRow {
  return {
    commerce_order_id: "co_buyerLookupTest01",
    shopify_order_id: SHOPIFY_ID,
    shopify_checkout_id: null,
    shopify_order_number: ORDER_NUMBER,
    buyer_email_hash: emailHash,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    artifact_intent_ids_json: "[]",
    print_order_ids_json: "[]",
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function printRow(commerceOrderId: string): PrintOrderRow {
  return {
    order_id: "po_buyerLookupTest1",
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: commerceOrderId,
    shopify_order_id: SHOPIFY_ID,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status: "in_production",
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:10:00Z",
  };
}

function dbFor(
  commerce: CommerceOrderRow | null,
  printOrders: PrintOrderRow[] = []
): D1Database {
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

describe("normalizeBuyerOrderRef", () => {
  it("strips leading hashes and surrounding whitespace", () => {
    expect(normalizeBuyerOrderRef("#1001")).toBe("1001");
    expect(normalizeBuyerOrderRef("  ##1001  ")).toBe("1001");
    expect(normalizeBuyerOrderRef("450789469")).toBe("450789469");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeBuyerOrderRef("")).toBe("");
    expect(normalizeBuyerOrderRef("   ")).toBe("");
    expect(normalizeBuyerOrderRef("###")).toBe("");
  });
});

describe("normalizeBuyerEmail / hashBuyerEmail", () => {
  it("trims and lowercases valid emails", () => {
    expect(normalizeBuyerEmail(`  ${EMAIL} `)).toBe(NORMALIZED_EMAIL);
  });

  it("rejects blank or @-less values", () => {
    expect(normalizeBuyerEmail("")).toBeNull();
    expect(normalizeBuyerEmail("   ")).toBeNull();
    expect(normalizeBuyerEmail("not-an-email")).toBeNull();
  });

  it("hashes case-insensitively after normalization", async () => {
    const a = await hashBuyerEmail(EMAIL);
    const b = await hashBuyerEmail(NORMALIZED_EMAIL);
    const c = await hashBuyerEmail("BUYER@EXAMPLE.COM");
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("lookupBuyerOrder", () => {
  it("resolves matching email + order number to commerce and print rows", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce = commerceRow(hash);
    const print = printRow(commerce.commerce_order_id);
    const result = await lookupBuyerOrder(
      dbFor(commerce, [print]),
      "#1001",
      `  ${EMAIL} `
    );
    expect(result).toEqual({ commerce, printOrders: [print] });
  });

  it("resolves by Shopify order id when present", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce = commerceRow(hash);
    const result = await lookupBuyerOrder(dbFor(commerce), SHOPIFY_ID, EMAIL);
    expect(result?.commerce.commerce_order_id).toBe(commerce.commerce_order_id);
  });

  it("returns null for wrong email hash without distinguishing existence", async () => {
    const commerce = commerceRow(await hashBuyerEmail(EMAIL));
    const result = await lookupBuyerOrder(
      dbFor(commerce),
      String(ORDER_NUMBER),
      "other@example.com"
    );
    expect(result).toBeNull();
  });

  it("returns null for unknown order refs and blank inputs", async () => {
    const hash = await hashBuyerEmail(EMAIL);
    const commerce = commerceRow(hash);
    expect(await lookupBuyerOrder(dbFor(commerce), "999999", EMAIL)).toBeNull();
    expect(await lookupBuyerOrder(dbFor(commerce), "   ", EMAIL)).toBeNull();
    expect(await lookupBuyerOrder(dbFor(commerce), "#1001", "nope")).toBeNull();
  });
});

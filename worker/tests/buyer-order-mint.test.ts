import { describe, expect, it } from "vitest";

import { buildBuyerMintStatus } from "../src/commerce/buyer-order-mint";
import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";

const COMMERCE: CommerceOrderRow = {
  commerce_order_id: "co_buyerMintTest01",
  shopify_order_id: "450789469",
  shopify_checkout_id: null,
  shopify_order_number: 1001,
  buyer_email_hash: "abc",
  profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  artifact_intent_ids_json: JSON.stringify(["ai_testIntent001"]),
  print_order_ids_json: JSON.stringify(["po_buyerMintTest1"]),
  status: "processing",
  hold_reason: null,
  created_at: "2026-05-16T17:00:00Z",
  updated_at: "2026-05-16T17:00:00Z",
};

const PRINT_ORDER: PrintOrderRow = {
  order_id: "po_buyerMintTest1",
  profile_id: COMMERCE.profile_id!,
  print_artifact_ids_json: JSON.stringify(["pa_testBuyerMint01"]),
  planned_item_qr_ids_json: JSON.stringify(["qr_testBuyerMint01"]),
  commerce_order_id: COMMERCE.commerce_order_id,
  shopify_order_id: COMMERCE.shopify_order_id,
  printify_order_id: null,
  printify_shop_id: null,
  template_id: "hoodie-live-object-v1",
  status: "awaiting_production_approval",
  shipping_method: "standard",
  tracking_carrier: null,
  tracking_number: null,
  tracking_url: null,
  last_reconciled_at: null,
  created_at: "2026-05-16T17:00:00Z",
  updated_at: "2026-05-16T17:05:00Z",
};

function dbMinted(minted: boolean): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("print_artifact_id = ?")) {
            if (!minted) return null;
            return {
              qr_id: "qr_testBuyerMint01",
              print_artifact_id: args[1],
            };
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("buildBuyerMintStatus", () => {
  it("returns not_applicable for Tier 0 inventory orders", async () => {
    const status = await buildBuyerMintStatus(
      dbMinted(false),
      {
        ...COMMERCE,
        artifact_intent_ids_json: "[]",
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        status: "processing",
      },
      []
    );
    expect(status.status).toBe("not_applicable");
  });

  it("returns pending with planned items when QRs are not minted", async () => {
    const status = await buildBuyerMintStatus(dbMinted(false), COMMERCE, [PRINT_ORDER]);
    expect(status.status).toBe("pending");
    expect(status.planned_items).toEqual([
      {
        planned_qr_id: "qr_testBuyerMint01",
        print_artifact_id: "pa_testBuyerMint01",
      },
    ]);
  });

  it("returns complete when planned QRs are minted", async () => {
    const status = await buildBuyerMintStatus(dbMinted(true), COMMERCE, [PRINT_ORDER]);
    expect(status.status).toBe("complete");
    expect(status.planned_items).toBeUndefined();
  });
});

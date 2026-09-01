import { describe, expect, it } from "vitest";

import type { CommerceOrderRow } from "../src/db/commerce-orders";
import type { PrintOrderRow } from "../src/db/print-orders";
import { handleGetStoreOrderStatus } from "../src/store/store-order-status-handler";
import {
  buildOrderTimeline,
  isValidArtifactIntentLookupId,
  isValidShopifyOrderLookupId,
  lookupStoreOrderStatusByShopifyOrderAndProfile,
  printStatusLabel,
} from "../src/store/store-order-status";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OTHER_PROFILE = "nSVXWPqgRFEhGPjxyRzidF6";
const INTENT = "ai_Hc9mP2nQ4rT6vW8yZ1";
const SHOPIFY = "450789469";
const COMMERCE = "co_storeLookupEdge01";

function commerce(overrides: Partial<CommerceOrderRow> = {}): CommerceOrderRow {
  return {
    commerce_order_id: COMMERCE,
    shopify_order_id: SHOPIFY,
    shopify_checkout_id: null,
    shopify_order_number: 1001,
    buyer_email_hash: null,
    profile_id: PROFILE,
    artifact_intent_ids_json: JSON.stringify([INTENT]),
    print_order_ids_json: "[]",
    status: "processing",
    hold_reason: null,
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T18:00:00Z",
    ...overrides,
  };
}

function printOrder(status: PrintOrderRow["status"]): PrintOrderRow {
  return {
    order_id: "po_storeLookupEdge01",
    profile_id: PROFILE,
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: COMMERCE,
    shopify_order_id: SHOPIFY,
    printify_order_id: null,
    printify_shop_id: null,
    template_id: "hc-sticker-square-v1",
    status,
    shipping_method: "standard",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T18:00:00Z",
  } as PrintOrderRow;
}

function dbFor(row: CommerceOrderRow | null): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM commerce_order_links WHERE shopify_order_id")) {
            return row && args[0] === row.shopify_order_id ? row : null;
          }
          if (sql.includes("FROM print_orders")) return null;
          if (sql.includes("FROM artifact_intents")) return null;
          return null;
        },
        all: async () => ({ results: [] }),
      }),
    }),
  } as unknown as D1Database;
}

async function errorBody(res: Response): Promise<{ error: string; message: string }> {
  return (await res.json()) as { error: string; message: string };
}

describe("store order-status lookup IDs", () => {
  it("accepts trimmed Base58 artifact intent ids and 3–20 digit Shopify ids", () => {
    expect(isValidArtifactIntentLookupId(`  ${INTENT}  `)).toBe(true);
    expect(isValidArtifactIntentLookupId("ai_123456789A")).toBe(true);
    expect(isValidShopifyOrderLookupId(`  ${SHOPIFY}  `)).toBe(true);
    expect(isValidShopifyOrderLookupId("100")).toBe(true);
    expect(isValidShopifyOrderLookupId("1".repeat(20))).toBe(true);
  });

  it("rejects ambiguous or injectable artifact intent ids", () => {
    expect(isValidArtifactIntentLookupId("")).toBe(false);
    expect(isValidArtifactIntentLookupId("ai_short")).toBe(false);
    expect(isValidArtifactIntentLookupId(`ai_${"1".repeat(25)}`)).toBe(false);
    expect(isValidArtifactIntentLookupId("ai_0abcde1234")).toBe(false);
    expect(isValidArtifactIntentLookupId("ai_Oabcde1234")).toBe(false);
    expect(isValidArtifactIntentLookupId("ai_Iabcde1234")).toBe(false);
    expect(isValidArtifactIntentLookupId("ai_labcde1234")).toBe(false);
    expect(isValidArtifactIntentLookupId("pa_Hc9mP2nQ4rT6vW8yZ1")).toBe(false);
    expect(isValidArtifactIntentLookupId(`${INTENT}' OR 1=1`)).toBe(false);
    expect(isValidArtifactIntentLookupId(`${INTENT}&shopify_order_id=1`)).toBe(false);
  });

  it("rejects non-numeric or out-of-range Shopify ids", () => {
    expect(isValidShopifyOrderLookupId("12")).toBe(false);
    expect(isValidShopifyOrderLookupId("1".repeat(21))).toBe(false);
    expect(isValidShopifyOrderLookupId("#1001")).toBe(false);
    expect(isValidShopifyOrderLookupId("450789469abc")).toBe(false);
    expect(isValidShopifyOrderLookupId("450-789-469")).toBe(false);
    expect(isValidShopifyOrderLookupId("")).toBe(false);
  });
});

describe("GET /v1/store/orders/status query gates", () => {
  const emptyDb = dbFor(null);

  it("rejects mixed artifact + Shopify lookup keys", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/orders/status?artifact_intent_id=${INTENT}&shopify_order_id=${SHOPIFY}`
      ),
      emptyDb
    );
    expect(res.status).toBe(422);
    expect(await errorBody(res)).toMatchObject({ error: "INVALID_LOOKUP_QUERY" });
  });

  it("rejects invalid artifact_intent_id before lookup", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request(
        "https://humanity.llc/v1/store/orders/status?artifact_intent_id=ai_0notValid"
      ),
      emptyDb
    );
    expect(res.status).toBe(422);
    expect(await errorBody(res)).toMatchObject({ error: "INVALID_ARTIFACT_INTENT_ID" });
  });

  it("rejects invalid shopify_order_id before lookup", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request("https://humanity.llc/v1/store/orders/status?shopify_order_id=%231001"),
      emptyDb
    );
    expect(res.status).toBe(422);
    expect(await errorBody(res)).toMatchObject({ error: "INVALID_SHOPIFY_ORDER_ID" });
  });

  it("rejects invalid profile_id on Shopify + profile lookup", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/orders/status?shopify_order_id=${SHOPIFY}&profile_id=not-a-profile`
      ),
      emptyDb
    );
    expect(res.status).toBe(422);
    expect(await errorBody(res)).toMatchObject({ error: "INVALID_PROFILE_ID" });
  });

  it("requires artifact_intent_id or shopify_order_id", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request("https://humanity.llc/v1/store/orders/status"),
      emptyDb
    );
    expect(res.status).toBe(422);
    expect(await errorBody(res)).toMatchObject({ error: "INVALID_LOOKUP_QUERY" });
  });

  it("returns 404 when Shopify order exists but profile_id does not match", async () => {
    const res = await handleGetStoreOrderStatus(
      new Request(
        `https://humanity.llc/v1/store/orders/status?shopify_order_id=${SHOPIFY}&profile_id=${OTHER_PROFILE}`
      ),
      dbFor(commerce())
    );
    expect(res.status).toBe(404);
    expect(await errorBody(res)).toMatchObject({ error: "ORDER_NOT_FOUND" });
    expect(
      await lookupStoreOrderStatusByShopifyOrderAndProfile(dbFor(commerce()), SHOPIFY, OTHER_PROFILE)
    ).toBeNull();
  });
});

describe("shopper-safe order status labels", () => {
  it("maps print statuses without leaking partner jargon", () => {
    expect(printStatusLabel("awaiting_production_approval")).toBe("Awaiting print approval");
    expect(printStatusLabel("submitted")).toBe("Sent to print partner");
    expect(printStatusLabel("in_production")).toBe("In production");
    expect(printStatusLabel("fulfilled")).toBe("Shipped");
    expect(printStatusLabel("partially_fulfilled")).toBe("Shipped");
    expect(printStatusLabel("on_hold")).toBe("On hold");
    expect(printStatusLabel("has_issues")).toBe("Production issue — support will follow up");
    expect(printStatusLabel("canceled")).toBe("Print canceled");
    expect(printStatusLabel("unfulfillable")).toBe("Unable to fulfill");
    expect(printStatusLabel("draft")).toBe("Processing");
    expect(printStatusLabel(null)).toBeNull();
  });

  it("keeps hold and cancel timeline details shopper-safe", () => {
    const held = buildOrderTimeline(
      commerce({ status: "held_for_review", hold_reason: "CHECKOUT_METADATA_MISSING" }),
      null,
      "sticker_personalized_v1"
    );
    expect(held.map((step) => step.id)).toEqual(["payment", "fulfillment"]);
    expect(held[0]?.state).toBe("issue");
    expect(held[0]?.detail).toMatch(/verify order details/i);
    expect(held[0]?.detail).not.toContain("CHECKOUT_METADATA_MISSING");

    const expired = buildOrderTimeline(
      commerce({ status: "held_for_review", hold_reason: "ARTIFACT_INTENT_EXPIRED" }),
      null,
      "sticker_personalized_v1"
    );
    expect(expired[0]?.detail).toMatch(/personalization session expired/i);

    const refunded = buildOrderTimeline(commerce({ status: "refunded" }), null, "sticker_personalized_v1");
    expect(refunded.map((step) => step.id)).toEqual(["payment"]);
    expect(refunded[0]?.detail).toBe("This order was refunded.");
    expect(refunded[0]?.state).toBe("issue");

    const canceled = buildOrderTimeline(commerce({ status: "canceled" }), null, "sticker_personalized_v1");
    expect(canceled[0]?.detail).toBe("This order was canceled.");
  });

  it("stops the timeline at a production issue instead of claiming shipped", () => {
    const steps = buildOrderTimeline(commerce(), printOrder("has_issues"), "sticker_personalized_v1");
    expect(steps.map((step) => step.id)).toEqual(["payment", "print_queued", "production"]);
    expect(steps.at(-1)?.state).toBe("issue");
    expect(steps.at(-1)?.label).toBe("Production issue — support will follow up");
    expect(steps.some((step) => step.id === "shipped")).toBe(false);
  });
});

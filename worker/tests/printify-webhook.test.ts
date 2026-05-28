import { describe, expect, it } from "vitest";

import type { PrintOrderRow } from "../src/db/print-orders";
import type { PrintifyWebhookReceiptRow } from "../src/db/printify-webhooks";
import { handlePostPrintifyWebhook } from "../src/http/printify-webhook";
import {
  mapPrintifyOrderStatus,
  statusFromPrintifyWebhookEvent,
} from "../src/print/printify-status-map";
import { verifyPrintifyWebhookSignature } from "../src/print/printify-webhook-verify";
import type { Env } from "../src/index";

const SECRET = "printify_webhook_test_secret";
const PRINTIFY_ORDER_ID = "5a96f649b2439217d070f507";
const PRINT_ORDER_ID = "po_test123456789012345";

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

function printOrderRow(overrides: Partial<PrintOrderRow> = {}): PrintOrderRow {
  return {
    order_id: PRINT_ORDER_ID,
    profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
    print_artifact_ids_json: "[]",
    planned_item_qr_ids_json: "[]",
    commerce_order_id: "co_test123456789012345",
    shopify_order_id: "shopify_123",
    printify_order_id: PRINTIFY_ORDER_ID,
    printify_shop_id: 99,
    template_id: "hc-tier0-sticker-batch-v1",
    status: "submitted",
    shipping_method: "standard",
    tracking_carrier: null,
    tracking_number: null,
    tracking_url: null,
    last_reconciled_at: null,
    created_at: "2026-05-27T00:00:00.000Z",
    updated_at: "2026-05-27T00:00:00.000Z",
    ...overrides,
  };
}

type DbState = {
  printOrders: Map<string, PrintOrderRow>;
  receipts: Map<string, PrintifyWebhookReceiptRow>;
  lastStatusUpdate: { orderId: string; status: string } | null;
};

function dbFor(state: DbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM printify_webhook_receipts")) {
            return state.receipts.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM print_orders WHERE printify_order_id")) {
            return state.printOrders.get(args[0] as string) ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO printify_webhook_receipts")) {
            state.receipts.set(args[0] as string, {
              event_id: args[0] as string,
              event_type: args[1] as string,
              printify_order_id: args[2] as string,
              print_order_id: args[3] as string | null,
              payload_hash: args[4] as string,
              processing_status: args[5] as PrintifyWebhookReceiptRow["processing_status"],
              received_at: args[6] as string,
            });
          }
          if (sql.includes("UPDATE print_orders")) {
            state.lastStatusUpdate = {
              orderId: args[6] as string,
              status: args[0] as string,
            };
            const row = [...state.printOrders.values()].find(
              (r) => r.order_id === (args[6] as string)
            );
            if (row) {
              row.status = args[0] as PrintOrderRow["status"];
              row.tracking_carrier = args[1] as string | null;
              row.tracking_number = args[2] as string | null;
              row.tracking_url = args[3] as string | null;
              row.updated_at = args[5] as string;
            }
          }
          return { success: true };
        },
      }),
    }),
  } as D1Database;
}

describe("printify-status-map", () => {
  it("maps provider statuses", () => {
    expect(mapPrintifyOrderStatus("in-production")).toBe("in_production");
    expect(mapPrintifyOrderStatus("on-hold")).toBe("on_hold");
  });

  it("derives status from webhook event types", () => {
    expect(statusFromPrintifyWebhookEvent("order:sent-to-production", null)).toBe(
      "in_production"
    );
    expect(statusFromPrintifyWebhookEvent("order:shipment:created", null)).toBe("fulfilled");
    expect(statusFromPrintifyWebhookEvent("order:updated", "canceled")).toBe("canceled");
  });
});

describe("verifyPrintifyWebhookSignature", () => {
  it("accepts valid sha256 signature", async () => {
    const body = '{"id":"evt_1"}';
    const sig = await signPayload(body);
    expect(await verifyPrintifyWebhookSignature(body, sig, SECRET)).toBeNull();
  });
});

describe("handlePostPrintifyWebhook", () => {
  it("updates print order on order:updated", async () => {
    const state: DbState = {
      printOrders: new Map([[PRINTIFY_ORDER_ID, printOrderRow()]]),
      receipts: new Map(),
      lastStatusUpdate: null,
    };
    const payload = JSON.stringify({
      id: "evt_in_production_1",
      type: "order:updated",
      resource: {
        id: PRINTIFY_ORDER_ID,
        type: "order",
        data: { shop_id: 99, status: "in-production" },
      },
    });
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": await signPayload(payload),
      },
      body: payload,
    });

    const res = await handlePostPrintifyWebhook(request, { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env, dbFor(state));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; processing_status: string };
    expect(body.status).toBe("in_production");
    expect(body.processing_status).toBe("processed");
    expect(state.lastStatusUpdate?.status).toBe("in_production");
  });

  it("stores tracking on order:shipment:created", async () => {
    const state: DbState = {
      printOrders: new Map([[PRINTIFY_ORDER_ID, printOrderRow()]]),
      receipts: new Map(),
      lastStatusUpdate: null,
    };
    const payload = JSON.stringify({
      id: "evt_shipment_1",
      type: "order:shipment:created",
      resource: {
        id: PRINTIFY_ORDER_ID,
        type: "order",
        data: {
          status: "fulfilled",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        },
      },
    });
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": await signPayload(payload),
      },
      body: payload,
    });

    const res = await handlePostPrintifyWebhook(request, { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env, dbFor(state));
    expect(res.status).toBe(200);
    const row = state.printOrders.get(PRINTIFY_ORDER_ID);
    expect(row?.status).toBe("fulfilled");
    expect(row?.tracking_number).toBe("9400111899223344556677");
  });

  it("processes tracking-only updates when provider status is unchanged", async () => {
    const state: DbState = {
      printOrders: new Map([
        [PRINTIFY_ORDER_ID, printOrderRow({ status: "fulfilled" })],
      ]),
      receipts: new Map(),
      lastStatusUpdate: null,
    };
    const payload = JSON.stringify({
      id: "evt_tracking_only_1",
      type: "order:updated",
      resource: {
        id: PRINTIFY_ORDER_ID,
        type: "order",
        data: {
          status: "fulfilled",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        },
      },
    });
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": await signPayload(payload),
      },
      body: payload,
    });

    const res = await handlePostPrintifyWebhook(request, { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env, dbFor(state));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      processing_status: string;
      status: string;
      tracking_updated: boolean;
    };
    expect(body.processing_status).toBe("processed");
    expect(body.status).toBe("fulfilled");
    expect(body.tracking_updated).toBe(true);
    const row = state.printOrders.get(PRINTIFY_ORDER_ID);
    expect(row?.status).toBe("fulfilled");
    expect(row?.tracking_number).toBe("9400111899223344556677");
  });

  it("ignores duplicate tracking when neither status nor tracking changes", async () => {
    const state: DbState = {
      printOrders: new Map([
        [
          PRINTIFY_ORDER_ID,
          printOrderRow({
            status: "fulfilled",
            tracking_carrier: "USPS",
            tracking_number: "9400111899223344556677",
            tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
          }),
        ],
      ]),
      receipts: new Map(),
      lastStatusUpdate: null,
    };
    const payload = JSON.stringify({
      id: "evt_tracking_duplicate_1",
      type: "order:updated",
      resource: {
        id: PRINTIFY_ORDER_ID,
        type: "order",
        data: {
          status: "fulfilled",
          shipments: [
            {
              carrier: "USPS",
              tracking_number: "9400111899223344556677",
              tracking_url: "https://tools.usps.com/go/TrackConfirmAction",
            },
          ],
        },
      },
    });
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": await signPayload(payload),
      },
      body: payload,
    });

    const res = await handlePostPrintifyWebhook(request, { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env, dbFor(state));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { processing_status: string; reason: string };
    expect(body.processing_status).toBe("ignored");
    expect(body.reason).toBe("NO_STATUS_TRANSITION");
    expect(state.lastStatusUpdate).toBeNull();
  });

  it("is idempotent for duplicate event ids", async () => {
    const state: DbState = {
      printOrders: new Map([[PRINTIFY_ORDER_ID, printOrderRow()]]),
      receipts: new Map([
        [
          "evt_dup",
          {
            event_id: "evt_dup",
            event_type: "order:updated",
            printify_order_id: PRINTIFY_ORDER_ID,
            print_order_id: PRINT_ORDER_ID,
            payload_hash: "abc",
            processing_status: "processed",
            received_at: "2026-05-27T00:00:00.000Z",
          },
        ],
      ]),
      lastStatusUpdate: null,
    };
    const payload = JSON.stringify({
      id: "evt_dup",
      type: "order:updated",
      resource: { id: PRINTIFY_ORDER_ID, type: "order", data: { status: "canceled" } },
    });
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": await signPayload(payload),
      },
      body: payload,
    });

    const res = await handlePostPrintifyWebhook(request, { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env, dbFor(state));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { duplicate: boolean };
    expect(body.duplicate).toBe(true);
    expect(state.lastStatusUpdate).toBeNull();
  });

  it("rejects invalid signature", async () => {
    const request = new Request("https://humanity.llc/v1/print/webhooks/printify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pfy-Signature": "sha256=deadbeef",
      },
      body: "{}",
    });
    const res = await handlePostPrintifyWebhook(
      request,
      { PRINTIFY_WEBHOOK_SECRET: SECRET } as Env,
      dbFor({ printOrders: new Map(), receipts: new Map(), lastStatusUpdate: null })
    );
    expect(res.status).toBe(401);
  });
});

import { describe, expect, it } from "vitest";

import {
  getPrintifyWebhookReceipt,
  insertPrintifyWebhookReceipt,
  type PrintifyWebhookReceiptRow,
} from "../src/db/printify-webhooks";

const EVENT_A = "evt_printifyOrderShippedAa";
const EVENT_B = "evt_printifyOrderShippedBb";
const PRINTIFY_ORDER = "po_factoryOrder919";
const PRINT_ORDER = "pr_localPrintOrder919";
const RECEIVED = "2026-08-15T10:00:00.000Z";

class FakePrintifyWebhookDb {
  receipts = new Map<string, PrintifyWebhookReceiptRow>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM printify_webhook_receipts WHERE event_id = ?")) {
              return (self.receipts.get(String(args[0])) ?? null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO printify_webhook_receipts")) {
              const row: PrintifyWebhookReceiptRow = {
                event_id: String(args[0]),
                event_type: String(args[1]),
                printify_order_id: String(args[2]),
                print_order_id: (args[3] as string | null) ?? null,
                payload_hash: String(args[4]),
                processing_status: args[5] as PrintifyWebhookReceiptRow["processing_status"],
                received_at: String(args[6]),
              };
              if (self.receipts.has(row.event_id)) {
                throw new Error("UNIQUE constraint failed: printify_webhook_receipts.event_id");
              }
              self.receipts.set(row.event_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakePrintifyWebhookDb): D1Database {
  return fake as unknown as D1Database;
}

describe("Printify webhook receipt db helpers", () => {
  it("returns null for an unseen event_id so the handler can process it", async () => {
    const fake = new FakePrintifyWebhookDb();
    await expect(getPrintifyWebhookReceipt(db(fake), EVENT_A)).resolves.toBeNull();
  });

  it("inserts a receipt and reads back the same event_id fields", async () => {
    const fake = new FakePrintifyWebhookDb();
    await insertPrintifyWebhookReceipt(db(fake), {
      event_id: EVENT_A,
      event_type: "order:shipment:created",
      printify_order_id: PRINTIFY_ORDER,
      print_order_id: PRINT_ORDER,
      payload_hash: "hash_shipped_aa",
      processing_status: "processed",
      received_at: RECEIVED,
    });

    await expect(getPrintifyWebhookReceipt(db(fake), EVENT_A)).resolves.toEqual({
      event_id: EVENT_A,
      event_type: "order:shipment:created",
      printify_order_id: PRINTIFY_ORDER,
      print_order_id: PRINT_ORDER,
      payload_hash: "hash_shipped_aa",
      processing_status: "processed",
      received_at: RECEIVED,
    });
  });

  it("keeps ignored receipts without a local print_order_id isolated by event_id", async () => {
    const fake = new FakePrintifyWebhookDb();
    await insertPrintifyWebhookReceipt(db(fake), {
      event_id: EVENT_A,
      event_type: "order:updated",
      printify_order_id: PRINTIFY_ORDER,
      print_order_id: null,
      payload_hash: "hash_ignored_aa",
      processing_status: "ignored",
      received_at: RECEIVED,
    });
    await insertPrintifyWebhookReceipt(db(fake), {
      event_id: EVENT_B,
      event_type: "order:shipment:created",
      printify_order_id: "po_otherFactoryOrder",
      print_order_id: "pr_otherLocalOrder",
      payload_hash: "hash_processed_bb",
      processing_status: "processed",
      received_at: RECEIVED,
    });

    const a = await getPrintifyWebhookReceipt(db(fake), EVENT_A);
    const b = await getPrintifyWebhookReceipt(db(fake), EVENT_B);
    expect(a?.processing_status).toBe("ignored");
    expect(a?.print_order_id).toBeNull();
    expect(b?.processing_status).toBe("processed");
    expect(b?.printify_order_id).toBe("po_otherFactoryOrder");
    await expect(getPrintifyWebhookReceipt(db(fake), "evt_missingPrintify")).resolves.toBeNull();
  });

  it("rejects a second insert for the same event_id so duplicates cannot overwrite status", async () => {
    const fake = new FakePrintifyWebhookDb();
    const first = {
      event_id: EVENT_A,
      event_type: "order:updated",
      printify_order_id: PRINTIFY_ORDER,
      print_order_id: PRINT_ORDER,
      payload_hash: "hash_first",
      processing_status: "processed" as const,
      received_at: RECEIVED,
    };
    await insertPrintifyWebhookReceipt(db(fake), first);
    await expect(
      insertPrintifyWebhookReceipt(db(fake), {
        ...first,
        processing_status: "failed",
        payload_hash: "hash_retry",
      })
    ).rejects.toThrow("UNIQUE constraint failed");
    await expect(getPrintifyWebhookReceipt(db(fake), EVENT_A)).resolves.toMatchObject({
      processing_status: "processed",
      payload_hash: "hash_first",
    });
  });
});

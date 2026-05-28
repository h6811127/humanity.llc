export type PrintifyWebhookProcessingStatus = "processed" | "ignored" | "failed";

export interface PrintifyWebhookReceiptRow {
  event_id: string;
  event_type: string;
  printify_order_id: string;
  print_order_id: string | null;
  payload_hash: string;
  processing_status: PrintifyWebhookProcessingStatus;
  received_at: string;
}

export async function getPrintifyWebhookReceipt(
  db: D1Database,
  eventId: string
): Promise<PrintifyWebhookReceiptRow | null> {
  return db
    .prepare(
      `SELECT event_id, event_type, printify_order_id, print_order_id,
              payload_hash, processing_status, received_at
       FROM printify_webhook_receipts WHERE event_id = ?`
    )
    .bind(eventId)
    .first<PrintifyWebhookReceiptRow>();
}

export async function insertPrintifyWebhookReceipt(
  db: D1Database,
  input: {
    event_id: string;
    event_type: string;
    printify_order_id: string;
    print_order_id: string | null;
    payload_hash: string;
    processing_status: PrintifyWebhookProcessingStatus;
    received_at: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO printify_webhook_receipts (
        event_id, event_type, printify_order_id, print_order_id,
        payload_hash, processing_status, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.event_id,
      input.event_type,
      input.printify_order_id,
      input.print_order_id,
      input.payload_hash,
      input.processing_status,
      input.received_at
    )
    .run();
}

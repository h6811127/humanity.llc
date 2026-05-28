-- O-003 Printify webhook idempotency (no raw payload / shipping PII).

PRAGMA foreign_keys = ON;

CREATE TABLE printify_webhook_receipts (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  printify_order_id TEXT NOT NULL,
  print_order_id TEXT,
  payload_hash TEXT NOT NULL,
  processing_status TEXT NOT NULL
    CHECK (processing_status IN ('processed', 'ignored', 'failed')),
  received_at TEXT NOT NULL
);

CREATE INDEX idx_printify_webhook_receipts_order
  ON printify_webhook_receipts (printify_order_id);

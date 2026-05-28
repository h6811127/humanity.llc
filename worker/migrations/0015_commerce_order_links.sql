-- Commerce order links + Shopify webhook idempotency (O-001).
-- No shipping PII; links paid Shopify orders to artifact intents for fulfillment.

PRAGMA foreign_keys = ON;

CREATE TABLE commerce_order_links (
  commerce_order_id TEXT PRIMARY KEY NOT NULL
    CHECK (commerce_order_id GLOB 'co_*'),
  shopify_order_id TEXT NOT NULL UNIQUE,
  shopify_checkout_id TEXT,
  profile_id TEXT REFERENCES cards (profile_id),
  artifact_intent_ids_json TEXT NOT NULL,
  print_order_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL
    CHECK (status IN (
      'paid',
      'processing',
      'fulfilled',
      'partially_fulfilled',
      'canceled',
      'refunded',
      'failed',
      'held_for_review'
    )),
  hold_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_commerce_orders_profile ON commerce_order_links (profile_id);
CREATE INDEX idx_commerce_orders_status ON commerce_order_links (status);

CREATE TABLE shopify_webhook_receipts (
  webhook_id TEXT PRIMARY KEY NOT NULL,
  topic TEXT NOT NULL,
  shopify_order_id TEXT,
  commerce_order_id TEXT REFERENCES commerce_order_links (commerce_order_id),
  processed_at TEXT NOT NULL
);

CREATE INDEX idx_shopify_webhook_receipts_order ON shopify_webhook_receipts (shopify_order_id);

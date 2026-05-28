-- Encrypted fulfillment PII (shipping) — separate from public trust tables (PM-FR-41).

PRAGMA foreign_keys = ON;

CREATE TABLE commerce_fulfillment_pii (
  commerce_order_id TEXT PRIMARY KEY NOT NULL
    REFERENCES commerce_order_links (commerce_order_id) ON DELETE CASCADE,
  shipping_iv_b64 TEXT NOT NULL,
  shipping_ciphertext_b64 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

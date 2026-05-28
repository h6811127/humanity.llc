-- Print orders for Printify fulfillment (O-002). No shipping PII in trust tables.

PRAGMA foreign_keys = ON;

CREATE TABLE print_orders (
  order_id TEXT PRIMARY KEY NOT NULL
    CHECK (order_id GLOB 'po_*'),
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  print_artifact_ids_json TEXT NOT NULL,
  planned_item_qr_ids_json TEXT NOT NULL,
  commerce_order_id TEXT NOT NULL UNIQUE REFERENCES commerce_order_links (commerce_order_id),
  shopify_order_id TEXT NOT NULL,
  printify_order_id TEXT,
  printify_shop_id INTEGER,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN (
      'draft',
      'awaiting_payment',
      'payment_failed',
      'paid',
      'submitted',
      'awaiting_production_approval',
      'in_production',
      'fulfilled',
      'partially_fulfilled',
      'on_hold',
      'has_issues',
      'unfulfillable',
      'canceled'
    )),
  shipping_method TEXT NOT NULL DEFAULT 'standard',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_print_orders_profile ON print_orders (profile_id);
CREATE INDEX idx_print_orders_shopify ON print_orders (shopify_order_id);
CREATE INDEX idx_print_orders_status ON print_orders (status);

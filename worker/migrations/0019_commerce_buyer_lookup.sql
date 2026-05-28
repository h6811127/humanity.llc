-- Buyer order status lookup (O-003) — email hash + order number, no plaintext email in D1.

PRAGMA foreign_keys = ON;

ALTER TABLE commerce_order_links ADD COLUMN buyer_email_hash TEXT;
ALTER TABLE commerce_order_links ADD COLUMN shopify_order_number INTEGER;

CREATE INDEX idx_commerce_orders_buyer_number ON commerce_order_links (shopify_order_number);

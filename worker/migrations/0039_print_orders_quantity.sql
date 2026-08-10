-- Persist ordered print quantity for Tier 0 batch (shared QR) fulfillment.
-- planned_item_qr_ids stays empty for campaign stickers; quantity drives Printify line qty.

PRAGMA foreign_keys = ON;

ALTER TABLE print_orders
  ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1
  CHECK (quantity >= 1 AND quantity <= 1000);

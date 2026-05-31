-- Buyer-selected QR print frame (Glitch hoodie white card vs transparent-on-garment).
-- See docs/MERCH_HEADLESS_COMMERCE.md § Glitch print frame background (buyer → fulfillment).

PRAGMA foreign_keys = ON;

ALTER TABLE artifact_intents ADD COLUMN print_frame_background TEXT NOT NULL DEFAULT 'full';

ALTER TABLE print_orders ADD COLUMN print_frame_background TEXT NOT NULL DEFAULT 'full';

-- Per-unit garment variant (Humanity key e.g. black-m) for Printify submit resolution.

PRAGMA foreign_keys = ON;

ALTER TABLE artifact_intents ADD COLUMN print_variant_id TEXT;

ALTER TABLE print_orders ADD COLUMN print_variant_id TEXT;

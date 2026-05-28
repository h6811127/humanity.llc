-- Print order carrier tracking (O-003 / PM-FR-34). No shipping address PII.

PRAGMA foreign_keys = ON;

ALTER TABLE print_orders ADD COLUMN tracking_carrier TEXT;
ALTER TABLE print_orders ADD COLUMN tracking_number TEXT;
ALTER TABLE print_orders ADD COLUMN tracking_url TEXT;
ALTER TABLE print_orders ADD COLUMN last_reconciled_at TEXT;

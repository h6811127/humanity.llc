-- Child-object QR scope: add object_id column (see docs/ROOT_CARD_AND_CHILD_OBJECTS.md).
-- Full table rebuild with child_object CHECK: worker/scripts/child-object-qr-schema-rebuild.sql

ALTER TABLE qr_credentials ADD COLUMN object_id TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_credentials_object_id ON qr_credentials (object_id)
  WHERE object_id IS NOT NULL;

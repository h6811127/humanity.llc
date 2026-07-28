-- One active QR per child_object / print_artifact (parity with card-scoped idx_qr_one_active_card_scope).
-- App-level check-then-insert alone races under concurrent issue-qr and can leave two live endpoints.

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_one_active_child_object
  ON qr_credentials (profile_id, object_id)
  WHERE scope = 'child_object' AND status = 'active' AND object_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_one_active_print_artifact
  ON qr_credentials (profile_id, print_artifact_id)
  WHERE scope = 'print_artifact' AND status = 'active' AND print_artifact_id IS NOT NULL;

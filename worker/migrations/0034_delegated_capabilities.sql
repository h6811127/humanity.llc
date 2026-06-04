-- Root-signed delegated child capabilities (step 17 schema slice).
-- See docs/DELEGATED_CHILD_CAPABILITY_SCHEMA.md and docs/DELEGATED_CHILD_CAPABILITIES_GATE.md.

CREATE TABLE IF NOT EXISTS delegated_capabilities (
  capability_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(capability_id) >= 8 AND length(capability_id) <= 80),
  parent_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  delegated_public_key TEXT NOT NULL
    CHECK (length(delegated_public_key) >= 20 AND length(delegated_public_key) <= 120),
  operations_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  label TEXT NOT NULL
    CHECK (length(label) >= 1 AND length(label) <= 120),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('active', 'revoked')),
  capability_document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delegated_capabilities_parent_signer
  ON delegated_capabilities (parent_profile_id, delegated_public_key, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegated_capabilities_one_active_signer
  ON delegated_capabilities (parent_profile_id, delegated_public_key)
  WHERE status = 'active';

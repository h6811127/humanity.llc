-- Full qr_credentials rebuild for child_object scope CHECK + object_id.
-- Apply via: npm run worker:apply-child-object-qr-schema -- --remote

PRAGMA foreign_keys = OFF;

CREATE TABLE qr_credentials_v23 (
  qr_id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL,
  epoch INTEGER NOT NULL DEFAULT 1 CHECK (epoch >= 1),
  scope TEXT NOT NULL CHECK (scope IN ('card', 'print_artifact', 'child_object')),
  print_artifact_id TEXT,
  object_id TEXT,
  resolver_hint TEXT NOT NULL DEFAULT 'https://humanity.llc',
  status TEXT NOT NULL
    CHECK (status IN ('active', 'revoked', 'expired', 'replaced')),
  payload TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  credential_document_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (scope = 'print_artifact' AND print_artifact_id IS NOT NULL AND object_id IS NULL)
    OR (scope = 'card' AND print_artifact_id IS NULL AND object_id IS NULL)
    OR (scope = 'child_object' AND object_id IS NOT NULL AND print_artifact_id IS NULL)
  )
);

INSERT INTO qr_credentials_v23 (
  qr_id,
  profile_id,
  epoch,
  scope,
  print_artifact_id,
  object_id,
  resolver_hint,
  status,
  payload,
  issued_at,
  expires_at,
  credential_document_json,
  created_at,
  updated_at
)
SELECT
  qr_id,
  profile_id,
  epoch,
  scope,
  print_artifact_id,
  object_id,
  resolver_hint,
  status,
  payload,
  issued_at,
  expires_at,
  credential_document_json,
  created_at,
  updated_at
FROM qr_credentials;

DROP TABLE qr_credentials;

ALTER TABLE qr_credentials_v23 RENAME TO qr_credentials;

CREATE INDEX IF NOT EXISTS idx_qr_credentials_profile_id ON qr_credentials (profile_id);
CREATE INDEX IF NOT EXISTS idx_qr_credentials_profile_status ON qr_credentials (profile_id, status);
CREATE INDEX IF NOT EXISTS idx_qr_credentials_print_artifact_id ON qr_credentials (print_artifact_id)
  WHERE print_artifact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_credentials_object_id ON qr_credentials (object_id)
  WHERE object_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_one_active_card_scope ON qr_credentials (profile_id)
  WHERE scope = 'card' AND status = 'active';

PRAGMA foreign_keys = ON;

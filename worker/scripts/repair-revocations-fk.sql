-- Rebuild revocations so target_qr_id REFERENCES qr_credentials (not stale backup names).
-- Apply via: npx wrangler d1 execute humanity-resolver --remote --config worker/wrangler.toml --file worker/scripts/repair-revocations-fk.sql
--
-- @see docs/LIVE_PROOF_FAILURE_INVESTIGATION.md (same class as live_control_challenges FK drift)

PRAGMA foreign_keys = OFF;

CREATE TABLE revocations_repair (
  revocation_id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  target_kind TEXT NOT NULL CHECK (target_kind IN ('card', 'qr_credential')),
  target_qr_id TEXT REFERENCES qr_credentials (qr_id),
  reason TEXT NOT NULL,
  signed_document_json TEXT NOT NULL,
  revoked_at TEXT NOT NULL,
  public_notice TEXT,
  cause_category TEXT,
  appeal_deadline TEXT,
  issuer_public_key TEXT,
  created_at TEXT NOT NULL,
  display_mode TEXT,
  public_reason TEXT,
  CHECK (
    (target_kind = 'qr_credential' AND target_qr_id IS NOT NULL)
    OR (target_kind = 'card' AND target_qr_id IS NULL)
  )
);

INSERT INTO revocations_repair SELECT * FROM revocations;

DROP TABLE revocations;

ALTER TABLE revocations_repair RENAME TO revocations;

CREATE INDEX IF NOT EXISTS idx_revocations_profile_id ON revocations (profile_id);
CREATE INDEX IF NOT EXISTS idx_revocations_target_qr_id ON revocations (target_qr_id);
CREATE INDEX IF NOT EXISTS idx_revocations_revoked_at ON revocations (revoked_at);

PRAGMA foreign_keys = ON;

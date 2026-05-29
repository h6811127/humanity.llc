-- Rebuild live_control_challenges so qr_id REFERENCES qr_credentials (not stale backup names).
-- Apply via: npm run worker:repair-live-control-challenges-fk -- --remote
--
-- @see docs/LIVE_PROOF_FAILURE_INVESTIGATION.md

PRAGMA foreign_keys = OFF;

CREATE TABLE live_control_challenges_repair (
  challenge_id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  qr_id TEXT REFERENCES qr_credentials (qr_id),
  nonce TEXT NOT NULL,
  verifier_session_id TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'proven', 'expired')),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  proven_at TEXT,
  signer_public_key TEXT,
  response_document_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO live_control_challenges_repair
SELECT * FROM live_control_challenges;

DROP TABLE live_control_challenges;

ALTER TABLE live_control_challenges_repair RENAME TO live_control_challenges;

CREATE INDEX IF NOT EXISTS idx_live_control_profile_id ON live_control_challenges (profile_id);
CREATE INDEX IF NOT EXISTS idx_live_control_expires_at ON live_control_challenges (expires_at);

PRAGMA foreign_keys = ON;

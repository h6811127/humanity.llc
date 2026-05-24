-- M7 alpha — short-lived live control proof challenges.
CREATE TABLE live_control_challenges (
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

CREATE INDEX idx_live_control_profile_id ON live_control_challenges (profile_id);
CREATE INDEX idx_live_control_expires_at ON live_control_challenges (expires_at);

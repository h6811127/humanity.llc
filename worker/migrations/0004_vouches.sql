-- M6 vouches: signed social verification records.
-- Public records only. Private notes must never be stored here.

PRAGMA foreign_keys = ON;

CREATE TABLE vouches (
  vouch_id TEXT PRIMARY KEY NOT NULL
    CHECK (vouch_id LIKE 'vouch_%'),
  voucher_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  vouchee_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  nonce TEXT NOT NULL,
  statement TEXT NOT NULL
    CHECK (length(statement) >= 1 AND length(statement) <= 280),
  method TEXT NOT NULL CHECK (method IN ('in_person')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  signed_document_json TEXT NOT NULL,
  revocation_document_json TEXT,
  revocation_nonce TEXT,
  issuer_public_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  CHECK (voucher_profile_id <> vouchee_profile_id)
);

CREATE UNIQUE INDEX idx_vouches_nonce ON vouches (nonce);
CREATE UNIQUE INDEX idx_vouches_revocation_nonce ON vouches (revocation_nonce)
  WHERE revocation_nonce IS NOT NULL;
CREATE INDEX idx_vouches_vouchee_status ON vouches (vouchee_profile_id, status);
CREATE INDEX idx_vouches_voucher_created ON vouches (voucher_profile_id, created_at);

-- A voucher may only have one active vouch for a given recipient.
CREATE UNIQUE INDEX idx_vouches_one_active_pair
  ON vouches (voucher_profile_id, vouchee_profile_id)
  WHERE status = 'active';

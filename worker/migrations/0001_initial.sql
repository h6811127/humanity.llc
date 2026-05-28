-- Humanity Commons reference resolver  -  initial schema (roadmap M1.2)
-- Contracts: docs/V1_IMPLEMENTATION_CONTRACTS.md
-- Data policy: docs/REFERENCE_OPERATOR_DATA_POLICY.md
--
-- These tables hold the public trust layer only. No private keys, government ID,
-- scan analytics, or commerce PII (Shopify/Printify shipping) belong here.

PRAGMA foreign_keys = ON;

-- Signed public Humanity Card documents (resolver copy of client-signed payload).
CREATE TABLE cards (
  profile_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(profile_id) >= 20 AND length(profile_id) <= 32),
  public_key TEXT NOT NULL,
  handle TEXT NOT NULL
    CHECK (length(handle) >= 3 AND length(handle) <= 32),
  handle_normalized TEXT NOT NULL,
  manifesto_line TEXT NOT NULL
    CHECK (length(manifesto_line) >= 1 AND length(manifesto_line) <= 280),
  status TEXT NOT NULL
    CHECK (status IN ('active', 'revoked', 'suspended', 'expired')),
  card_document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_cards_handle_normalized ON cards (handle_normalized);
CREATE INDEX idx_cards_status ON cards (status);
CREATE INDEX idx_cards_public_key ON cards (public_key);

-- QR credentials: card-scoped (rotation) and print_artifact-scoped (per physical item).
CREATE TABLE qr_credentials (
  qr_id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  epoch INTEGER NOT NULL DEFAULT 1 CHECK (epoch >= 1),
  scope TEXT NOT NULL CHECK (scope IN ('card', 'print_artifact')),
  print_artifact_id TEXT,
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
    (scope = 'print_artifact' AND print_artifact_id IS NOT NULL)
    OR (scope = 'card' AND print_artifact_id IS NULL)
  )
);

CREATE INDEX idx_qr_credentials_profile_id ON qr_credentials (profile_id);
CREATE INDEX idx_qr_credentials_profile_status ON qr_credentials (profile_id, status);
CREATE INDEX idx_qr_credentials_print_artifact_id ON qr_credentials (print_artifact_id)
  WHERE print_artifact_id IS NOT NULL;

-- At most one active card-scoped QR per profile (rotation replaces prior as `replaced`).
CREATE UNIQUE INDEX idx_qr_one_active_card_scope ON qr_credentials (profile_id)
  WHERE scope = 'card' AND status = 'active';

-- Public verification aggregate (vouches/credentials filled in M6).
CREATE TABLE verification_summaries (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES cards (profile_id),
  state TEXT NOT NULL CHECK (
    state IN (
      'unverified',
      'registered',
      'verified_human',
      'steward',
      'revoked',
      'suspended'
    )
  ),
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  label TEXT NOT NULL,
  method TEXT NOT NULL CHECK (
    method IN ('none', 'registered', 'vouch', 'ceremony', 'device_proof', 'steward')
  ),
  vouch_count INTEGER NOT NULL DEFAULT 0 CHECK (vouch_count >= 0),
  latest_accepted_vouch_at TEXT,
  credential_ids_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(credential_ids_json)),
  summary_document_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_verification_summaries_state ON verification_summaries (state);

-- Append-only signed revocation / suspension statements (current truth on cards/qr rows).
CREATE TABLE revocations (
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
  CHECK (
    (target_kind = 'qr_credential' AND target_qr_id IS NOT NULL)
    OR (target_kind = 'card' AND target_qr_id IS NULL)
  )
);

CREATE INDEX idx_revocations_profile_id ON revocations (profile_id);
CREATE INDEX idx_revocations_target_qr_id ON revocations (target_qr_id);
CREATE INDEX idx_revocations_revoked_at ON revocations (revoked_at);

-- Vouch trust-and-safety P1: public appeal intake for suspended profiles.
-- Appeals move operator cases to appealed status for steward review.

PRAGMA foreign_keys = ON;

CREATE TABLE vouch_appeals (
  appeal_id TEXT PRIMARY KEY NOT NULL CHECK (appeal_id LIKE 'appeal_%'),
  reference_code TEXT UNIQUE CHECK (
    reference_code IS NULL OR (
      reference_code LIKE 'vra_%' AND length(reference_code) >= 8 AND length(reference_code) <= 32
    )
  ),
  case_id TEXT NOT NULL REFERENCES vouch_cases (case_id),
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  statement TEXT NOT NULL CHECK (length(statement) >= 1 AND length(statement) <= 1000),
  contact_method TEXT CHECK (
    contact_method IS NULL OR (
      length(contact_method) >= 1 AND length(contact_method) <= 200
    )
  ),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_vouch_appeals_case_created
  ON vouch_appeals (case_id, created_at DESC);

CREATE INDEX idx_vouch_appeals_profile_created
  ON vouch_appeals (profile_id, created_at DESC);

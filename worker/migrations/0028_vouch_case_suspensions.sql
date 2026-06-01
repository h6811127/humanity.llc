-- Vouch trust-and-safety P0: case-linked governance suspension records.
-- The card status row remains the current resolver truth; this table records
-- the operator case and public notice that caused the suspension.

PRAGMA foreign_keys = ON;

CREATE TABLE vouch_case_suspensions (
  suspension_id TEXT PRIMARY KEY NOT NULL,
  case_id TEXT NOT NULL REFERENCES vouch_cases (case_id),
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  status TEXT NOT NULL DEFAULT 'suspended' CHECK (status = 'suspended'),
  public_label TEXT NOT NULL DEFAULT 'Suspended under public rules',
  cause_category TEXT NOT NULL CHECK (
    cause_category IN (
      'impersonation',
      'vouch_abuse',
      'harassment',
      'illegal_content',
      'security_compromise',
      'other'
    )
  ),
  notice TEXT NOT NULL CHECK (length(notice) >= 1 AND length(notice) <= 500),
  appeal_deadline TEXT NOT NULL,
  signed_document_json TEXT,
  suspended_by TEXT NOT NULL DEFAULT 'operator'
    CHECK (length(suspended_by) >= 1 AND length(suspended_by) <= 120),
  suspended_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_vouch_case_suspensions_case
  ON vouch_case_suspensions (case_id, suspended_at DESC);

CREATE INDEX idx_vouch_case_suspensions_profile
  ON vouch_case_suspensions (profile_id, suspended_at DESC);

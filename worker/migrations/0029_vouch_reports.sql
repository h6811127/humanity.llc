-- Vouch trust-and-safety P1: public report intake records.
-- Reports create operator cases; reference codes are returned when contact is provided.

PRAGMA foreign_keys = ON;

CREATE TABLE vouch_reports (
  report_id TEXT PRIMARY KEY NOT NULL CHECK (report_id LIKE 'report_%'),
  reference_code TEXT UNIQUE CHECK (
    reference_code IS NULL OR (
      reference_code LIKE 'vrr_%' AND length(reference_code) >= 8 AND length(reference_code) <= 32
    )
  ),
  kind TEXT NOT NULL CHECK (
    kind IN (
      'false_vouch',
      'coerced_vouch',
      'statement_abuse',
      'impersonation',
      'stolen_qr_or_artifact',
      'harassment',
      'integrator_misuse'
    )
  ),
  target_raw TEXT NOT NULL CHECK (length(target_raw) >= 1 AND length(target_raw) <= 2048),
  target_profile_id TEXT,
  target_vouch_id TEXT CHECK (
    target_vouch_id IS NULL OR target_vouch_id LIKE 'vouch_%'
  ),
  target_scan_url TEXT,
  statement TEXT NOT NULL CHECK (length(statement) >= 1 AND length(statement) <= 1000),
  contact_method TEXT CHECK (
    contact_method IS NULL OR (
      length(contact_method) >= 1 AND length(contact_method) <= 200
    )
  ),
  case_id TEXT NOT NULL REFERENCES vouch_cases (case_id),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_vouch_reports_case_created
  ON vouch_reports (case_id, created_at DESC);

CREATE INDEX idx_vouch_reports_kind_created
  ON vouch_reports (kind, created_at DESC);

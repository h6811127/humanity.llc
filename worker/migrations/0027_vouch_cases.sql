-- Vouch trust-and-safety P0: durable operator cases.
-- Converts computed audit flags and manual operator reports into reviewable cases.

PRAGMA foreign_keys = ON;

CREATE TABLE vouch_cases (
  case_id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'vouch_graph',
      'steward_burst',
      'false_vouch',
      'statement_abuse',
      'impersonation',
      'harassment',
      'other'
    )
  ),
  source TEXT NOT NULL CHECK (
    source IN ('audit_flag', 'operator_manual', 'public_report')
  ),
  source_key TEXT NOT NULL CHECK (length(source_key) >= 1 AND length(source_key) <= 512),
  subject_profile_ids_json TEXT NOT NULL DEFAULT '[]',
  subject_vouch_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN (
      'open',
      'watching',
      'action_required',
      'dismissed',
      'suspended',
      'appealed',
      'closed'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'p1' CHECK (priority IN ('p0', 'p1', 'p2')),
  threat_ids_json TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL CHECK (length(summary) >= 1 AND length(summary) <= 500),
  created_by TEXT NOT NULL DEFAULT 'operator' CHECK (length(created_by) >= 1 AND length(created_by) <= 120),
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_vouch_cases_status_updated
  ON vouch_cases (status, updated_at DESC);

CREATE INDEX idx_vouch_cases_source_updated
  ON vouch_cases (source, updated_at DESC);

CREATE UNIQUE INDEX idx_vouch_cases_open_source_key
  ON vouch_cases (source, source_key)
  WHERE status IN ('open', 'watching', 'action_required', 'appealed', 'suspended');

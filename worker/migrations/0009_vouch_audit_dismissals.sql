-- M6 Step 4 (operator-only): steward review dismiss/notes persistence.
-- Stores review annotations for computed vouch audit flags.

PRAGMA foreign_keys = ON;

CREATE TABLE vouch_audit_dismissals (
  flag_key TEXT PRIMARY KEY NOT NULL,
  flag_kind TEXT NOT NULL CHECK (
    flag_kind IN ('closed_loop_only', 'burst_at_quota_boundary', 'shared_voucher_set')
  ),
  note TEXT NOT NULL CHECK (length(note) >= 1 AND length(note) <= 500),
  dismissed_by TEXT NOT NULL CHECK (length(dismissed_by) >= 1 AND length(dismissed_by) <= 120),
  dismissed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_vouch_audit_dismissals_kind_updated
  ON vouch_audit_dismissals (flag_kind, updated_at DESC);

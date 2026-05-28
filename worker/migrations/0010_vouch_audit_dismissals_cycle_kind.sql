-- Expand dismissal kind enum for new directed cycle cluster audit flag (G-02).

PRAGMA foreign_keys = OFF;

CREATE TABLE vouch_audit_dismissals_new (
  flag_key TEXT PRIMARY KEY NOT NULL,
  flag_kind TEXT NOT NULL CHECK (
    flag_kind IN (
      'closed_loop_only',
      'burst_at_quota_boundary',
      'shared_voucher_set',
      'directed_cycle_cluster'
    )
  ),
  note TEXT NOT NULL CHECK (length(note) >= 1 AND length(note) <= 500),
  dismissed_by TEXT NOT NULL CHECK (length(dismissed_by) >= 1 AND length(dismissed_by) <= 120),
  dismissed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO vouch_audit_dismissals_new (
  flag_key,
  flag_kind,
  note,
  dismissed_by,
  dismissed_at,
  updated_at
)
SELECT
  flag_key,
  flag_kind,
  note,
  dismissed_by,
  dismissed_at,
  updated_at
FROM vouch_audit_dismissals;

DROP TABLE vouch_audit_dismissals;
ALTER TABLE vouch_audit_dismissals_new RENAME TO vouch_audit_dismissals;

CREATE INDEX idx_vouch_audit_dismissals_kind_updated
  ON vouch_audit_dismissals (flag_kind, updated_at DESC);

PRAGMA foreign_keys = ON;

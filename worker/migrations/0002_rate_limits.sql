-- M2.4: rate limit card creation (Technical Standards §15: 10 creates / IP / hour).
-- Stores hashed client key only — no raw IP in this table.

CREATE TABLE rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  window_start TEXT NOT NULL
);

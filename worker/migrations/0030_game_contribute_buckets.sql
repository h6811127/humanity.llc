-- Aggregate-only quorum counters for city game contribute (no per-scanner rows).
CREATE TABLE IF NOT EXISTS game_contribute_buckets (
  object_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  bucket_date TEXT NOT NULL,
  contribution_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (object_id, season_id, bucket_date)
);

CREATE INDEX IF NOT EXISTS idx_game_contribute_buckets_date
  ON game_contribute_buckets (bucket_date);

-- Operator-wide Worker request budget (UTC day). Soft cap degrades health; hard cap is informational.
CREATE TABLE IF NOT EXISTS operator_usage_counters (
  event TEXT NOT NULL,
  window_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event, window_key)
);

CREATE INDEX IF NOT EXISTS idx_operator_usage_counters_window
  ON operator_usage_counters (window_key);

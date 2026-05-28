-- M8.4: aggregate merch funnel counters (scan landing + attributed creates). No per-user rows.
CREATE TABLE IF NOT EXISTS merch_funnel_counters (
  ref TEXT NOT NULL,
  event TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ref, event, day)
);

CREATE INDEX IF NOT EXISTS idx_merch_funnel_counters_day ON merch_funnel_counters (day);

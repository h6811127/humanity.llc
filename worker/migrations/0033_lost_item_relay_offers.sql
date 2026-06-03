-- Layer 2 offer verb — anonymous finder messages on lost_item_relay child objects.
-- No scanner identity stored (message + object scope only).

CREATE TABLE IF NOT EXISTS lost_item_relay_offers (
  offer_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(offer_id) >= 10 AND length(offer_id) <= 64),
  parent_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  object_id TEXT NOT NULL
    CHECK (length(object_id) >= 8 AND length(object_id) <= 80),
  qr_id TEXT,
  message TEXT NOT NULL
    CHECK (length(message) >= 1 AND length(message) <= 280),
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lost_item_relay_offers_object_pending
  ON lost_item_relay_offers (object_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lost_item_relay_offers_expires
  ON lost_item_relay_offers (expires_at);

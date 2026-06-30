-- Tier 2 Web Push subscription store (RFC P2 step 2)

CREATE TABLE steward_web_push_subscriptions (
  endpoint TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES steward_accounts (account_id),
  device_id TEXT NOT NULL DEFAULT '',
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expiration_time INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_steward_web_push_account
  ON steward_web_push_subscriptions (account_id);

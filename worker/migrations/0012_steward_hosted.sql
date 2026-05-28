-- E1 hosted steward tier (optional extension; see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md)

CREATE TABLE steward_plan_definitions (
  plan_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  entitlements_json TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (plan_id, plan_version)
);

CREATE TABLE steward_accounts (
  account_id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'suspended')),
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  overrides_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE steward_account_profiles (
  account_id TEXT NOT NULL REFERENCES steward_accounts (account_id),
  profile_id TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (account_id, profile_id)
);

CREATE UNIQUE INDEX idx_steward_profile_unique ON steward_account_profiles (profile_id);

CREATE TABLE steward_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES steward_accounts (account_id),
  device_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX idx_steward_sessions_account ON steward_sessions (account_id);

CREATE TABLE steward_usage_counters (
  account_id TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  event TEXT NOT NULL,
  window_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, device_id, event, window_key)
);

CREATE TABLE steward_link_nonces (
  nonce TEXT PRIMARY KEY NOT NULL,
  used_at TEXT NOT NULL
);

INSERT INTO steward_plan_definitions (plan_id, plan_version, entitlements_json, description)
VALUES
  (
    'reference_free',
    1,
    '{"steward.hosted":false,"notify.push.live_proof":false,"poll.live_proof.auto_daily_cap":400,"poll.live_proof.idle_ms":60000,"poll.live_proof.active_ms":5000,"poll.network.max_parallel":2,"poll.network.manual_max_parallel":1,"wallet.large_threshold":10,"sw.periodic_min_ms":900000}',
    'Default public reference tier'
  ),
  (
    'hosted_steward_v1',
    1,
    '{"steward.hosted":true,"notify.push.live_proof":true,"poll.live_proof.auto_daily_cap":4000,"poll.live_proof.idle_ms":30000,"poll.live_proof.active_ms":5000,"poll.network.max_parallel":5,"poll.network.manual_max_parallel":3,"wallet.large_threshold":25,"sw.periodic_min_ms":300000}',
    'Optional hosted steward infrastructure'
  );

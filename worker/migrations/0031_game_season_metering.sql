-- City game season entitlements + usage metering (M2 extension)
-- @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md § City game season

CREATE TABLE game_season_usage_counters (
  season_id TEXT NOT NULL,
  event TEXT NOT NULL,
  window_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (season_id, event, window_key)
);

-- reference_free + hosted_steward_v1: pilot fair-use game caps
UPDATE steward_plan_definitions
SET entitlements_json = '{"steward.hosted":false,"notify.push.live_proof":false,"poll.live_proof.auto_daily_cap":400,"poll.live_proof.idle_ms":60000,"poll.live_proof.active_ms":5000,"poll.network.max_parallel":2,"poll.network.manual_max_parallel":1,"wallet.large_threshold":10,"sw.periodic_min_ms":900000,"game.season.enabled":true,"game.season.node_cap":15,"game.contribute.daily_cap":25000,"game.snapshot.daily_cap":100000,"game.game_update.daily_cap":500}'
WHERE plan_id = 'reference_free' AND plan_version = 1;

UPDATE steward_plan_definitions
SET entitlements_json = '{"steward.hosted":true,"notify.push.live_proof":true,"poll.live_proof.auto_daily_cap":4000,"poll.live_proof.idle_ms":30000,"poll.live_proof.active_ms":5000,"poll.network.max_parallel":5,"poll.network.manual_max_parallel":3,"wallet.large_threshold":25,"sw.periodic_min_ms":300000,"game.season.enabled":true,"game.season.node_cap":15,"game.contribute.daily_cap":25000,"game.snapshot.daily_cap":100000,"game.game_update.daily_cap":500}'
WHERE plan_id = 'hosted_steward_v1' AND plan_version = 1;

INSERT INTO steward_plan_definitions (plan_id, plan_version, entitlements_json, description)
VALUES
  (
    'hosted_game_season_v1',
    1,
    '{"game.season.enabled":true,"game.season.node_cap":50,"game.contribute.daily_cap":250000,"game.snapshot.daily_cap":1000000,"game.game_update.daily_cap":5000}',
    'Optional paid city-game season capacity (resolver fair use)'
  );

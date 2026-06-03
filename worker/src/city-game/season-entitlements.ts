import type { EntitlementMap } from "../steward/plans";

/** Canonical game-season entitlement keys (M2 extension). */
export const GAME_ENTITLEMENT_SEASON_ENABLED = "game.season.enabled";
export const GAME_ENTITLEMENT_SEASON_NODE_CAP = "game.season.node_cap";
export const GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP = "game.contribute.daily_cap";
export const GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP = "game.snapshot.daily_cap";
export const GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP = "game.game_update.daily_cap";

export const GAME_ENTITLEMENT_KEYS = [
  GAME_ENTITLEMENT_SEASON_ENABLED,
  GAME_ENTITLEMENT_SEASON_NODE_CAP,
  GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP,
  GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP,
  GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP,
] as const;

/** Server metering event names — attribute to `season_id` in `game_season_usage_counters`. */
export const GAME_METER_EVENT_CONTRIBUTE = "game.contribute";
export const GAME_METER_EVENT_SNAPSHOT = "game.snapshot.get";
export const GAME_METER_EVENT_UPDATE = "game.game_update";

export const HOSTED_GAME_SEASON_PLAN_ID = "hosted_game_season_v1";

/** S1 pilot footprint — free self-serve fair use (Phase E). */
export const REFERENCE_FREE_GAME_NODE_CAP = 15;

/** S3 stretch footprint — paid season plan default. */
export const HOSTED_GAME_SEASON_NODE_CAP = 50;

export type GameSeasonLimits = {
  enabled: boolean;
  nodeCap: number;
  contributeDailyCap: number;
  snapshotDailyCap: number;
  gameUpdateDailyCap: number;
};

/** Normative defaults when plan omits game keys (reference operator). */
export const REFERENCE_FREE_GAME_ENTITLEMENTS: EntitlementMap = {
  [GAME_ENTITLEMENT_SEASON_ENABLED]: true,
  [GAME_ENTITLEMENT_SEASON_NODE_CAP]: REFERENCE_FREE_GAME_NODE_CAP,
  [GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP]: 25_000,
  [GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP]: 100_000,
  [GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP]: 500,
};

export const HOSTED_GAME_SEASON_ENTITLEMENTS: EntitlementMap = {
  ...REFERENCE_FREE_GAME_ENTITLEMENTS,
  [GAME_ENTITLEMENT_SEASON_NODE_CAP]: HOSTED_GAME_SEASON_NODE_CAP,
  [GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP]: 250_000,
  [GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP]: 1_000_000,
  [GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP]: 5_000,
};

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export function pickGameEntitlements(source: EntitlementMap): EntitlementMap {
  const out: EntitlementMap = {};
  for (const key of GAME_ENTITLEMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  }
  return out;
}

/** Merge plan/account entitlements onto reference-free game defaults. */
export function gameSeasonLimitsFromEntitlements(
  entitlements: EntitlementMap
): GameSeasonLimits {
  const merged = {
    ...REFERENCE_FREE_GAME_ENTITLEMENTS,
    ...pickGameEntitlements(entitlements),
  };
  return {
    enabled: merged[GAME_ENTITLEMENT_SEASON_ENABLED] === true,
    nodeCap: positiveInt(
      merged[GAME_ENTITLEMENT_SEASON_NODE_CAP],
      REFERENCE_FREE_GAME_NODE_CAP
    ),
    contributeDailyCap: positiveInt(
      merged[GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP],
      REFERENCE_FREE_GAME_ENTITLEMENTS[GAME_ENTITLEMENT_CONTRIBUTE_DAILY_CAP] as number
    ),
    snapshotDailyCap: positiveInt(
      merged[GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP],
      REFERENCE_FREE_GAME_ENTITLEMENTS[GAME_ENTITLEMENT_SNAPSHOT_DAILY_CAP] as number
    ),
    gameUpdateDailyCap: positiveInt(
      merged[GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP],
      REFERENCE_FREE_GAME_ENTITLEMENTS[GAME_ENTITLEMENT_GAME_UPDATE_DAILY_CAP] as number
    ),
  };
}

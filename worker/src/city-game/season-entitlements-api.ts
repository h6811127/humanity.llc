import { profileLinkedAccount } from "../steward/db";
import type { EntitlementMap } from "../steward/plans";
import { utcDayKey } from "../steward/plans";
import { GAME_SEASON_ID_RE } from "./constants";
import {
  GAME_METER_EVENT_CONTRIBUTE,
  GAME_METER_EVENT_SNAPSHOT,
  GAME_METER_EVENT_UPDATE,
  gameSeasonLimitsFromEntitlements,
} from "./season-entitlements";
import { getGameSeasonUsageCount, gameSeasonSchemaReady } from "./season-quota";
import { registeredSeasons, resolveSeasonById } from "./season-loader";
import type { CrSeasonConfig } from "./season-config";

export type GameSeasonUsageBlock = {
  season_id: string;
  enabled: boolean;
  limits: Record<string, number>;
  usage: {
    period: "utc_day";
    period_key: string;
    counters: Record<string, number>;
    limits: Record<string, number>;
  };
};

export function parseGameSeasonIdQuery(url: URL): string | null {
  const raw = url.searchParams.get("season_id")?.trim();
  if (!raw || !GAME_SEASON_ID_RE.test(raw)) return null;
  return raw;
}

/** Seasons whose root profile is linked to this steward account. */
export async function listAuthorizedSeasonIdsForAccount(
  db: D1Database,
  accountId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT profile_id FROM steward_account_profiles WHERE account_id = ?`
    )
    .bind(accountId)
    .all<{ profile_id: string }>();

  const profiles = new Set((results ?? []).map((row) => row.profile_id));
  const seasonIds: string[] = [];

  for (const season of registeredSeasons()) {
    const root = season.season_root_profile_id?.trim();
    if (root && profiles.has(root)) {
      seasonIds.push(season.season_id);
    }
  }

  return seasonIds.sort();
}

export async function accountMayAccessGameSeason(
  db: D1Database,
  accountId: string,
  seasonId: string
): Promise<boolean> {
  const season = resolveSeasonById(seasonId);
  if (!season) return false;
  const root = season.season_root_profile_id?.trim();
  if (!root) return false;
  const linked = await profileLinkedAccount(db, root);
  return linked === accountId;
}

export async function buildGameSeasonUsageBlock(
  db: D1Database,
  season: CrSeasonConfig,
  entitlements: EntitlementMap,
  dayKey = utcDayKey()
): Promise<GameSeasonUsageBlock | null> {
  if (!(await gameSeasonSchemaReady(db))) return null;

  const limits = gameSeasonLimitsFromEntitlements(entitlements);
  const seasonId = season.season_id;

  const [contribute, snapshot, gameUpdate] = await Promise.all([
    getGameSeasonUsageCount(db, seasonId, GAME_METER_EVENT_CONTRIBUTE, dayKey),
    getGameSeasonUsageCount(db, seasonId, GAME_METER_EVENT_SNAPSHOT, dayKey),
    getGameSeasonUsageCount(db, seasonId, GAME_METER_EVENT_UPDATE, dayKey),
  ]);

  const limitMap = {
    "game.season.node_cap": limits.nodeCap,
    "game.contribute.daily_cap": limits.contributeDailyCap,
    "game.snapshot.daily_cap": limits.snapshotDailyCap,
    "game.game_update.daily_cap": limits.gameUpdateDailyCap,
  };

  const counters = {
    [GAME_METER_EVENT_CONTRIBUTE]: contribute,
    [GAME_METER_EVENT_SNAPSHOT]: snapshot,
    [GAME_METER_EVENT_UPDATE]: gameUpdate,
  };

  return {
    season_id: seasonId,
    enabled: limits.enabled,
    limits: limitMap,
    usage: {
      period: "utc_day",
      period_key: dayKey,
      counters,
      limits: {
        [GAME_METER_EVENT_CONTRIBUTE]: limits.contributeDailyCap,
        [GAME_METER_EVENT_SNAPSHOT]: limits.snapshotDailyCap,
        [GAME_METER_EVENT_UPDATE]: limits.gameUpdateDailyCap,
      },
    },
  };
}

export type GameSeasonEntitlementsAttachment =
  | GameSeasonUsageBlock
  | { season_ids: string[]; hint: string };

/**
 * Resolve optional `?season_id=` for GET /steward/entitlements.
 * Auto-includes usage when the account links exactly one season root.
 */
export async function resolveGameSeasonEntitlementsAttachment(
  db: D1Database,
  accountId: string,
  entitlements: EntitlementMap,
  seasonIdQuery: string | null
): Promise<GameSeasonEntitlementsAttachment | null> {
  if (seasonIdQuery) {
    if (!(await accountMayAccessGameSeason(db, accountId, seasonIdQuery))) {
      return null;
    }
    const season = resolveSeasonById(seasonIdQuery);
    if (!season) return null;
    return buildGameSeasonUsageBlock(db, season, entitlements);
  }

  const authorized = await listAuthorizedSeasonIdsForAccount(db, accountId);
  if (authorized.length === 1) {
    const season = resolveSeasonById(authorized[0]);
    if (!season) return null;
    return buildGameSeasonUsageBlock(db, season, entitlements);
  }

  if (authorized.length > 1) {
    return {
      season_ids: authorized,
      hint: "Pass ?season_id= to receive usage counters for a linked season.",
    };
  }

  return null;
}

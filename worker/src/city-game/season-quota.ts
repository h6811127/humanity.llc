import { jsonResponse } from "../http/resolver";
import { utcDayKey } from "../steward/plans";
import type { CrSeasonConfig } from "./season-config";
import {
  GAME_METER_EVENT_CONTRIBUTE,
  GAME_METER_EVENT_SNAPSHOT,
  GAME_METER_EVENT_UPDATE,
} from "./season-entitlements";
import { resolveGameSeasonLimits } from "./season-entitlements-resolve";
import type { GameSeasonLimits } from "./season-entitlements";

export async function gameSeasonSchemaReady(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .bind("game_season_usage_counters")
    .first();
  return !!row;
}

export async function getGameSeasonUsageCount(
  db: D1Database,
  seasonId: string,
  event: string,
  windowKey: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT count FROM game_season_usage_counters
       WHERE season_id = ? AND event = ? AND window_key = ?`
    )
    .bind(seasonId, event, windowKey)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function incrementGameSeasonUsage(
  db: D1Database,
  seasonId: string,
  event: string,
  windowKey: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO game_season_usage_counters (season_id, event, window_key, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(season_id, event, window_key)
       DO UPDATE SET count = count + 1`
    )
    .bind(seasonId, event, windowKey)
    .run();
  return getGameSeasonUsageCount(db, seasonId, event, windowKey);
}

export function gameSeasonQuotaExceededResponse(
  event: string,
  used: number,
  limit: number,
  message: string
): Response {
  return jsonResponse(
    {
      error: "game_season_quota_exceeded",
      message,
      retry_after: 3600,
      usage: { [event]: used, limit },
    },
    429
  );
}

async function checkSeasonMeter(
  db: D1Database,
  seasonId: string,
  event: string,
  cap: number,
  message: string
): Promise<Response | null> {
  const dayKey = utcDayKey();
  const used = await getGameSeasonUsageCount(db, seasonId, event, dayKey);
  if (used >= cap) {
    return gameSeasonQuotaExceededResponse(event, used, cap, message);
  }
  return null;
}

/**
 * Returns 429 when the season is disabled or over its daily contribute cap.
 * Returns null when metering is off (schema missing) or under cap.
 */
export async function enforceGameContributeSeasonQuota(
  db: D1Database,
  season: CrSeasonConfig,
  limits?: GameSeasonLimits
): Promise<Response | null> {
  if (!(await gameSeasonSchemaReady(db))) return null;

  const resolved = limits ?? (await resolveGameSeasonLimits(db, season));
  if (!resolved.enabled) {
    return gameSeasonQuotaExceededResponse(
      GAME_METER_EVENT_CONTRIBUTE,
      0,
      0,
      "City game seasons are not enabled for this organizer account."
    );
  }

  return checkSeasonMeter(
    db,
    season.season_id,
    GAME_METER_EVENT_CONTRIBUTE,
    resolved.contributeDailyCap,
    "Daily contribution limit reached for this game season."
  );
}

export async function recordGameContributeSeasonUsage(
  db: D1Database,
  seasonId: string
): Promise<void> {
  if (!(await gameSeasonSchemaReady(db))) return;
  await incrementGameSeasonUsage(db, seasonId, GAME_METER_EVENT_CONTRIBUTE, utcDayKey());
}

export async function enforceGameSnapshotSeasonQuota(
  db: D1Database,
  season: CrSeasonConfig,
  limits?: GameSeasonLimits
): Promise<Response | null> {
  if (!(await gameSeasonSchemaReady(db))) return null;

  const resolved = limits ?? (await resolveGameSeasonLimits(db, season));
  if (!resolved.enabled) {
    return gameSeasonQuotaExceededResponse(
      GAME_METER_EVENT_SNAPSHOT,
      0,
      0,
      "City game seasons are not enabled for this organizer account."
    );
  }

  return checkSeasonMeter(
    db,
    season.season_id,
    GAME_METER_EVENT_SNAPSHOT,
    resolved.snapshotDailyCap,
    "Daily map snapshot limit reached for this game season."
  );
}

export async function recordGameSnapshotSeasonUsage(
  db: D1Database,
  seasonId: string
): Promise<void> {
  if (!(await gameSeasonSchemaReady(db))) return;
  await incrementGameSeasonUsage(db, seasonId, GAME_METER_EVENT_SNAPSHOT, utcDayKey());
}

export async function enforceGameUpdateSeasonQuota(
  db: D1Database,
  season: CrSeasonConfig,
  limits?: GameSeasonLimits
): Promise<Response | null> {
  if (!(await gameSeasonSchemaReady(db))) return null;

  const resolved = limits ?? (await resolveGameSeasonLimits(db, season));
  if (!resolved.enabled) {
    return gameSeasonQuotaExceededResponse(
      GAME_METER_EVENT_UPDATE,
      0,
      0,
      "City game seasons are not enabled for this organizer account."
    );
  }

  return checkSeasonMeter(
    db,
    season.season_id,
    GAME_METER_EVENT_UPDATE,
    resolved.gameUpdateDailyCap,
    "Daily game-update limit reached for this game season."
  );
}

export async function recordGameUpdateSeasonUsage(
  db: D1Database,
  seasonId: string
): Promise<void> {
  if (!(await gameSeasonSchemaReady(db))) return;
  await incrementGameSeasonUsage(db, seasonId, GAME_METER_EVENT_UPDATE, utcDayKey());
}

export async function enforceGameNodeCap(
  db: D1Database,
  season: CrSeasonConfig,
  activeGameNodeCount: number,
  limits?: GameSeasonLimits
): Promise<Response | null> {
  if (!(await gameSeasonSchemaReady(db))) return null;

  const resolved = limits ?? (await resolveGameSeasonLimits(db, season));
  if (!resolved.enabled) {
    return gameSeasonQuotaExceededResponse(
      "game.season.node_cap",
      activeGameNodeCount,
      0,
      "City game seasons are not enabled for this organizer account."
    );
  }

  if (activeGameNodeCount >= resolved.nodeCap) {
    return gameSeasonQuotaExceededResponse(
      "game.season.node_cap",
      activeGameNodeCount,
      resolved.nodeCap,
      "Game node limit reached for this season. Upgrade your season plan to add more nodes."
    );
  }

  return null;
}

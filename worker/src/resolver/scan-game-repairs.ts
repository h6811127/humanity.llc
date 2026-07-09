import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import {
  isSeasonRootProfile,
  resolveSeasonForProfile,
} from "../city-game/season-loader";
import type { CrSeasonConfig } from "../city-game/season-config";
import { seasonNodeIdForObject } from "../city-game/season-config";
import { reconcileSeasonUnlockDrift } from "../city-game/unlock-evaluator";
import { persistRelayDecayIfExpired } from "../city-game/relay-decay-cron";
import { loadScanContext, type ScanContext } from "../db/scan";

export interface ScanGameRepairEnv {
  CITY_GAME_ENABLED?: string;
}

export async function loadScanContextWithGameRepairs(
  db: D1Database,
  profileId: string,
  qrId: string,
  now: Date,
  env: ScanGameRepairEnv,
  season: CrSeasonConfig | null = resolveSeasonForProfile(profileId)
): Promise<ScanContext> {
  let ctx = await loadScanContext(db, profileId, qrId);
  if (!isCityGameEnabled(env) || !season) return ctx;

  let reloaded = false;

  if (shouldRepairGameUnlockDriftOnScan(env, profileId, ctx, season)) {
    const { repaired } = await reconcileSeasonUnlockDrift(db, now, season);
    if (repaired.length > 0) reloaded = true;
  }

  if (
    ctx.childObject?.object_type === GAME_NODE_OBJECT_TYPE &&
    isSeasonRootProfile(profileId, season)
  ) {
    const nodeId = seasonNodeIdForObject(ctx.childObject.object_id, season);
    const role = season.nodes.find((row) => row.node_id === nodeId)?.role;
    if (role === "relay_gate") {
      const decayed = await persistRelayDecayIfExpiredFailOpen(db, {
        objectId: ctx.childObject.object_id,
        parentProfileId: profileId,
        now,
      });
      if (decayed) reloaded = true;
    }
  }

  if (reloaded) {
    ctx = await loadScanContext(db, profileId, qrId);
  }
  return ctx;
}

function shouldRepairGameUnlockDriftOnScan(
  env: ScanGameRepairEnv,
  profileId: string,
  ctx: ScanContext,
  season: CrSeasonConfig
): boolean {
  if (!isCityGameEnabled(env)) return false;
  if (ctx.childObject?.object_type !== GAME_NODE_OBJECT_TYPE) return false;
  return isSeasonRootProfile(profileId, season);
}

async function persistRelayDecayIfExpiredFailOpen(
  db: D1Database,
  input: { objectId: string; parentProfileId: string; now: Date }
): Promise<boolean> {
  try {
    return await persistRelayDecayIfExpired(db, input);
  } catch (e) {
    if (e instanceof Error && e.message === "RELAY_DECAY_WRITE_CONFLICT") {
      return false;
    }
    throw e;
  }
}

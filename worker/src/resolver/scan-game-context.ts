import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import { persistRelayDecayIfExpired } from "../city-game/relay-decay-cron";
import {
  isSeasonRootProfile,
  resolveSeasonForProfile,
} from "../city-game/season-loader";
import { seasonNodeIdForObject } from "../city-game/season-config";
import { reconcileSeasonUnlockDrift } from "../city-game/unlock-evaluator";
import { loadScanContext, type ScanContext } from "../db/scan";

export type ScanGameEnv = {
  CITY_GAME_ENABLED?: string;
  CITY_GAME_LOCAL_PLAY_OPEN?: string;
};

export type ScanGameSeason = ReturnType<typeof resolveSeasonForProfile>;

export async function loadScanContextWithGameRepairs(
  db: D1Database,
  profileId: string,
  qrId: string,
  now: Date,
  env: ScanGameEnv,
  season: ScanGameSeason
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
      const decayed = await persistRelayDecayIfExpired(db, {
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
  env: ScanGameEnv,
  profileId: string,
  ctx: ScanContext,
  season: ScanGameSeason
): boolean {
  if (!isCityGameEnabled(env)) return false;
  if (!season) return false;
  if (ctx.childObject?.object_type !== GAME_NODE_OBJECT_TYPE) return false;
  return isSeasonRootProfile(profileId, season);
}

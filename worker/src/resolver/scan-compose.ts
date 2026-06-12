import { GAME_NODE_OBJECT_TYPE, isCityGameEnabled } from "../city-game/constants";
import {
  isSeasonRootProfile,
  resolveSeasonForProfile,
} from "../city-game/season-loader";
import { seasonNodeIdForObject } from "../city-game/season-config";
import { reconcileSeasonUnlockDrift } from "../city-game/unlock-evaluator";
import { persistRelayDecayIfExpired } from "../city-game/relay-decay-cron";
import { loadScanContext, type ScanContext } from "../db/scan";
import { buildScanViewModel, type ScanViewModel } from "./scan-state";

export type ScanCompositionEnv = {
  CITY_GAME_ENABLED?: string;
  CITY_GAME_LOCAL_PLAY_OPEN?: string;
};

export type ScanCompositionResult = {
  ctx: ScanContext;
  vm: ScanViewModel;
  season: ReturnType<typeof resolveSeasonForProfile>;
};

/**
 * Shared scan composition for public HTML and status JSON. Status JSON is a
 * machine-readable mirror of scan HTML, so game repair/env/season inputs must match.
 */
export async function buildScanViewModelWithContext(
  db: D1Database,
  profileId: string,
  qrId: string,
  origin: string,
  now: Date,
  env: ScanCompositionEnv
): Promise<ScanCompositionResult> {
  const season = resolveSeasonForProfile(profileId);
  const ctx = await loadScanContextWithGameRepairs(
    db,
    profileId,
    qrId,
    now,
    env,
    season
  );
  const vm = buildScanViewModel(profileId, qrId, ctx, origin, now, {
    env: {
      CITY_GAME_ENABLED: env.CITY_GAME_ENABLED,
      CITY_GAME_LOCAL_PLAY_OPEN: env.CITY_GAME_LOCAL_PLAY_OPEN,
    },
    season: season ?? undefined,
  });
  return { ctx, vm, season };
}

async function loadScanContextWithGameRepairs(
  db: D1Database,
  profileId: string,
  qrId: string,
  now: Date,
  env: { CITY_GAME_ENABLED?: string },
  season: ReturnType<typeof resolveSeasonForProfile>
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
  env: { CITY_GAME_ENABLED?: string },
  profileId: string,
  ctx: ScanContext,
  season: ReturnType<typeof resolveSeasonForProfile>
): boolean {
  if (!isCityGameEnabled(env)) return false;
  if (!season) return false;
  if (ctx.childObject?.object_type !== GAME_NODE_OBJECT_TYPE) return false;
  return isSeasonRootProfile(profileId, season);
}

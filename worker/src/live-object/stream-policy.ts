import type { GameMeta } from "../city-game/game-meta";
import { applyBulletinScheduleToStreams } from "../city-game/bulletin-schedule";
import { applyRouteWindowScheduleToStreams } from "../city-game/route-window-schedule";
import type { GameNodeScanContext } from "../city-game/scan-view";
import type { CrSeasonConfig } from "../city-game/season-config";
import type { SeasonWindowPhase } from "../city-game/season-window";
import type { ObjectPublicStream } from "../validation/object-streams";

/** Care stream values that mute scheduled game bulletin/route overlays. */
export const CARE_PAUSE_RE = /pause|closed|maintenance|flood|blocked|out of service/i;

export type StreamPolicyPhase =
  | "plain"
  | "care_pause"
  | "game_scheduled"
  | "game_muted";

export type StreamPolicyInput = {
  streams: ObjectPublicStream[];
  now: Date;
  season: Pick<
    CrSeasonConfig,
    "window" | "status" | "bulletin_schedule" | "route_window_schedule"
  >;
  gameNode: GameNodeScanContext | null;
  nodeId: string | null;
  nodeRole?: string;
  gameMeta?: GameMeta;
  seasonWindowPhase?: SeasonWindowPhase;
};

export type StreamPolicyResult = {
  streams: ObjectPublicStream[];
  phase: StreamPolicyPhase;
  carePaused: boolean;
  gameOverlaysApplied: boolean;
  coopHint: string | null;
  publicStateOverride: string | null;
};

export function isCareStreamPaused(streams: ObjectPublicStream[]): boolean {
  const care = streams.find((s) => s.class === "care" || s.id === "care");
  if (!care?.value) return false;
  return CARE_PAUSE_RE.test(care.value);
}

function gameScheduleContext(input: StreamPolicyInput): {
  nodeRole: string;
  gameMeta: GameMeta;
  seasonWindowPhase: SeasonWindowPhase;
} | null {
  if (input.gameNode) {
    return {
      nodeRole: input.gameNode.nodeRole,
      gameMeta: input.gameNode.gameMeta,
      seasonWindowPhase: input.gameNode.seasonWindowPhase,
    };
  }
  if (
    input.nodeRole &&
    input.gameMeta &&
    input.seasonWindowPhase != null
  ) {
    return {
      nodeRole: input.nodeRole,
      gameMeta: input.gameMeta,
      seasonWindowPhase: input.seasonWindowPhase,
    };
  }
  return null;
}

/**
 * Apply stream precedence: care mutes game schedules; bulletin then route when live.
 * Shared by scan SSR and map snapshot derivation.
 */
export function resolveStreamPolicy(input: StreamPolicyInput): StreamPolicyResult {
  const carePaused = isCareStreamPaused(input.streams);
  if (carePaused) {
    return {
      streams: input.streams,
      phase: "care_pause",
      carePaused: true,
      gameOverlaysApplied: false,
      coopHint: null,
      publicStateOverride: null,
    };
  }

  const scheduleCtx = gameScheduleContext(input);
  if (!input.nodeId || !scheduleCtx || input.gameNode?.mode === "fallback") {
    return {
      streams: input.streams,
      phase: input.gameNode ? "game_muted" : "plain",
      carePaused: false,
      gameOverlaysApplied: false,
      coopHint: null,
      publicStateOverride: null,
    };
  }

  if (
    input.gameNode &&
    input.gameNode.mode !== "game" &&
    input.gameNode.enabled
  ) {
    return {
      streams: input.streams,
      phase: "game_muted",
      carePaused: false,
      gameOverlaysApplied: false,
      coopHint: null,
      publicStateOverride: null,
    };
  }

  let streams = applyBulletinScheduleToStreams(
    input.streams,
    input.nodeId,
    input.now,
    input.season,
    scheduleCtx
  );
  const routeApply = applyRouteWindowScheduleToStreams(
    streams,
    input.nodeId,
    input.now,
    input.season,
    scheduleCtx
  );
  streams = routeApply.streams;

  return {
    streams,
    phase: "game_scheduled",
    carePaused: false,
    gameOverlaysApplied: true,
    coopHint: routeApply.coopHint,
    publicStateOverride: routeApply.publicState,
  };
}

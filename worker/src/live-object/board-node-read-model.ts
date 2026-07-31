import type { ChildObjectRow } from "../db/types";
import type { CrSeasonConfig } from "../city-game/season-config";
import type { GameNodeScanMode } from "../city-game/scan-view";
import { composeChildObjectScanState } from "./compose-child-object-scan";
import type { StreamPolicyResult } from "./stream-policy";

/** Board-facing lifecycle derived from child object status. */
export type BoardNodeLifecycle = "active" | "revoked" | "paused";

/** Aggregate-safe chip row shared by scan/board read models. */
export type BoardNodeChip = {
  kind: string;
  label: string;
  value: string;
};

export function resolveBoardNodeLifecycle(
  status: ChildObjectRow["status"]
): BoardNodeLifecycle {
  if (status === "revoked") return "revoked";
  if (status === "disabled") return "paused";
  return "active";
}

export function childRowForBoardCompose(
  child: Pick<
    ChildObjectRow,
    | "object_id"
    | "object_type"
    | "status"
    | "public_state"
    | "public_label"
    | "child_object_document_json"
  >,
  labelFallback: string
): ChildObjectRow {
  return {
    object_id: child.object_id,
    parent_profile_id: "",
    object_type: child.object_type,
    public_label: child.public_label?.trim() || labelFallback,
    public_state: child.public_state,
    status: child.status,
    child_object_document_json: child.child_object_document_json,
    created_at: "",
    updated_at: "",
  };
}

export type ActiveBoardNodeReadModel = {
  publicState: string;
  streamPolicy: StreamPolicyResult | null;
  mapMode: GameNodeScanMode | "fallback";
};

/**
 * Compose scan-equivalent headline + mode for active lifecycle board rows.
 * Revoked/paused lifecycles must not call this (terminal board path).
 */
export function composeActiveBoardNodeReadModel(input: {
  child: Pick<
    ChildObjectRow,
    | "object_id"
    | "object_type"
    | "status"
    | "public_state"
    | "public_label"
    | "child_object_document_json"
  >;
  labelFallback: string;
  season: CrSeasonConfig;
  env: { CITY_GAME_ENABLED?: string; CITY_GAME_LOCAL_PLAY_OPEN?: string };
  now: Date;
}): ActiveBoardNodeReadModel {
  const composed = composeChildObjectScanState({
    child: childRowForBoardCompose(input.child, input.labelFallback),
    season: input.season,
    env: input.env,
    now: input.now,
  });
  return {
    publicState: composed.publicState,
    streamPolicy: composed.streamPolicy,
    mapMode: composed.gameNode?.mode ?? "fallback",
  };
}

/** Map mode when board row does not run compose (revoked / disabled child). */
export function resolveNonActiveBoardMapMode(
  lifecycle: Exclude<BoardNodeLifecycle, "active">
): "revoked" | "care_pause" {
  return lifecycle === "revoked" ? "revoked" : "care_pause";
}

/**
 * Lifecycle- and care-driven chips shared across object types.
 * Returns null when game-specific chips should be appended.
 */
export function buildUniversalBoardNodeChips(input: {
  lifecycle: BoardNodeLifecycle;
  map_mode: string;
  public_state: string;
}): BoardNodeChip[] | null {
  if (input.lifecycle === "revoked") {
    return [{ kind: "revoked", label: "Status", value: "Revoked" }];
  }
  if (input.map_mode === "care_pause") {
    return [
      {
        kind: "maintenance",
        label: "Care",
        value: input.public_state.trim() || "Maintenance pause",
      },
    ];
  }
  return null;
}

import type { ChildObjectRow } from "../db/types";
import { composeChildObjectScanState } from "../live-object/compose-child-object-scan";
import type { GameMeta } from "./game-meta";
import {
  resolveActiveBulletinSlot,
  type BulletinScheduleSlot,
} from "./bulletin-schedule";
import {
  resolveActiveRouteWindowSlot,
  type RouteWindowSlot,
} from "./route-window-schedule";
import {
  type CrSeasonConfig,
  seasonFragmentNodeIds,
  seasonNodeIdForObject,
} from "./season-config";
import {
  parseGameNodeFields,
  type GameNodeScanMode,
} from "./scan-view";
import { seasonWindowChip, type SeasonWindowPhase } from "./season-window";
import { factionControllerLabel, isGameFactionHold } from "./factions";
import { fragmentLatticeProgress } from "./unlock-engine";
import type { GameVouchGate } from "./vouch-graph";
import { mapVouchChipValue, resolveWitnessGate } from "./witness-gate";
import { applyRelayDecayIfExpired } from "./relay-contribute";

export type MapNodeChip = {
  kind: string;
  label: string;
  value: string;
};

export type MapNodeSnapshotRow = {
  node_id: string;
  label: string;
  district: string;
  role: string;
  lifecycle: "active" | "revoked" | "paused";
  map_mode: GameNodeScanMode | "revoked";
  public_state: string;
  game_meta: GameMeta;
  route_open: boolean | null;
  active_bulletin: BulletinScheduleSlot | null;
  active_route: RouteWindowSlot | null;
  /** Witness vouch gate — same evaluation as scan SSR when witness index supplied. */
  vouch_gate: GameVouchGate | null;
};

function mapScheduleSlots(input: {
  streamPolicy: { gameOverlaysApplied: boolean } | null;
  nodeId: string;
  nodeRole: string;
  gameMeta: GameMeta;
  now: Date;
  season: CrSeasonConfig;
}): {
  activeBulletin: BulletinScheduleSlot | null;
  activeRoute: RouteWindowSlot | null;
} {
  if (!input.streamPolicy?.gameOverlaysApplied) {
    return { activeBulletin: null, activeRoute: null };
  }
  const activeBulletin =
    input.nodeRole === "relay_gate" && !input.gameMeta.compromised
      ? resolveActiveBulletinSlot(input.nodeId, input.now, input.season)
      : null;
  const activeRoute = resolveActiveRouteWindowSlot(
    input.nodeId,
    input.now,
    input.season
  );
  return { activeBulletin, activeRoute };
}

function childRowForCompose(
  child: Pick<
    ChildObjectRow,
    "object_id" | "object_type" | "status" | "public_state" | "public_label" | "child_object_document_json"
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

/** Derive aggregate-safe map row from a child object (same precedence as scan SSR). */
export function deriveMapNodeSnapshot(input: {
  child: Pick<
    ChildObjectRow,
    | "object_id"
    | "object_type"
    | "status"
    | "public_state"
    | "public_label"
    | "child_object_document_json"
  >;
  season: CrSeasonConfig;
  env: { CITY_GAME_ENABLED?: string };
  now: Date;
  /** All active witness node metas for the season — enables vouch gate on board rows. */
  witnessMetaByNodeId?: Record<string, GameMeta>;
}): MapNodeSnapshotRow | null {
  if (input.child.object_type !== "game_node") return null;
  const nodeId = seasonNodeIdForObject(input.child.object_id, input.season);
  if (!nodeId) return null;
  const registry = input.season.nodes.find((row) => row.node_id === nodeId);
  if (!registry) return null;

  let documentJson = input.child.child_object_document_json;
  let publicStateForCompose = input.child.public_state;
  try {
    const doc = JSON.parse(documentJson) as Record<string, unknown>;
    const decayed = applyRelayDecayIfExpired(doc, input.now);
    if (decayed.decayed) {
      documentJson = JSON.stringify(decayed.doc);
      publicStateForCompose =
        typeof decayed.doc.public_state === "string"
          ? decayed.doc.public_state
          : publicStateForCompose;
    }
  } catch {
    /* parseGameNodeFields below keeps malformed documents out of the board. */
  }

  const fields = parseGameNodeFields(documentJson);
  if (!fields || fields.seasonId !== input.season.season_id) return null;

  const lifecycle: MapNodeSnapshotRow["lifecycle"] =
    input.child.status === "revoked"
      ? "revoked"
      : input.child.status === "disabled"
        ? "paused"
        : "active";

  let mapMode: MapNodeSnapshotRow["map_mode"] = "fallback";
  let publicState = input.child.public_state;
  let streamPolicy = null;

  if (lifecycle === "active") {
    const composed = composeChildObjectScanState({
      child: childRowForCompose(
        {
          ...input.child,
          public_state: publicStateForCompose,
          child_object_document_json: documentJson,
        },
        registry.label
      ),
      season: input.season,
      env: input.env,
      now: input.now,
      vouchWitnesses: input.witnessMetaByNodeId,
    });
    streamPolicy = composed.streamPolicy;
    publicState = composed.publicState;
    mapMode = composed.gameNode?.mode ?? "fallback";
  } else if (lifecycle === "revoked") {
    mapMode = "revoked";
  } else {
    mapMode = "care_pause";
  }

  const { activeBulletin, activeRoute } = mapScheduleSlots({
    streamPolicy,
    nodeId,
    nodeRole: registry.role,
    gameMeta: fields.gameMeta,
    now: input.now,
    season: input.season,
  });

  const vouchGate = resolveWitnessGate({
    targetNodeId: nodeId,
    gameMeta: fields.gameMeta,
    witnessMetaByNodeId: input.witnessMetaByNodeId ?? {},
  });

  return {
    node_id: nodeId,
    label: registry.label,
    district: registry.district,
    role: registry.role,
    lifecycle,
    map_mode: mapMode,
    public_state: publicState,
    game_meta: fields.gameMeta,
    route_open: streamPolicy?.gameOverlaysApplied
      ? (activeRoute?.route_open ?? null)
      : null,
    active_bulletin: activeBulletin,
    active_route: activeRoute,
    vouch_gate: vouchGate,
  };
}

const ARTIFACT_CHIP_LABELS: Record<string, string> = {
  double_capture: "Rare · double network weight",
  shield_generator: "Rare · shielded until hold expires",
  faction_bonus: "Rare · faction bonus weight",
  hidden_relay: "Rare · hidden until captured",
};

/** Aggregate-safe pin chips for the city board (PWM-MS01–12). */
export function buildMapNodeChips(
  row: MapNodeSnapshotRow,
  seasonWindowPhase: SeasonWindowPhase,
  opts: { rumored?: Set<string> } = {}
): MapNodeChip[] {
  if (row.lifecycle === "revoked") {
    return [{ kind: "revoked", label: "Status", value: "Revoked" }];
  }
  if (row.map_mode === "care_pause") {
    return [
      {
        kind: "maintenance",
        label: "Care",
        value: row.public_state.trim() || "Maintenance pause",
      },
    ];
  }

  const chips: MapNodeChip[] = [];
  const meta = row.game_meta;
  const windowNote = seasonWindowChip(seasonWindowPhase);
  if (windowNote) {
    chips.push({ kind: "chapter", label: "Season", value: windowNote });
  }

  if (row.map_mode === "dormant") {
    chips.push({ kind: "drop", label: "Object", value: "Dormant" });
    return chips.slice(0, 4);
  }

  if (meta.compromised) {
    chips.push({
      kind: "faction",
      label: "Relay",
      value: "Compromised · rekey pending",
    });
  }

  if (meta.artifact_id && ARTIFACT_CHIP_LABELS[meta.artifact_id]) {
    chips.push({
      kind: "drop",
      label: "Artifact",
      value: ARTIFACT_CHIP_LABELS[meta.artifact_id],
    });
  }

  if (meta.evolution_week != null && meta.evolution_week > 0) {
    chips.push({
      kind: "chapter",
      label: "Evolution",
      value: `Week ${meta.evolution_week} fiction live`,
    });
  }

  if (opts.rumored?.has(row.node_id) && row.role === "relay_gate") {
    const hold = meta.held_by_faction;
    if (!hold || hold === "neutral") {
      chips.push({
        kind: "route",
        label: "Signal",
        value: "Rumored relay · scan to contest",
      });
    }
  }

  if (
    row.role === "relay_gate" &&
    meta.held_by_faction &&
    isGameFactionHold(meta.held_by_faction) &&
    meta.held_by_faction !== "neutral"
  ) {
    chips.push({
      kind: "faction",
      label: "Hold",
      value: factionControllerLabel(meta.held_by_faction),
    });
    if (meta.held_until) {
      chips.push({
        kind: "route",
        label: "Hold until",
        value: meta.held_until.slice(0, 16).replace("T", " "),
      });
    }
    if (meta.points_per_hour != null && meta.points_per_hour > 0) {
      chips.push({
        kind: "faction",
        label: "Weight",
        value: `${meta.points_per_hour} pts/hr`,
      });
    }
  }

  if (row.active_bulletin?.controller?.trim()) {
    chips.push({
      kind: "faction",
      label: "Controller",
      value: row.active_bulletin.controller.trim(),
    });
  }
  if (row.active_bulletin?.relay_status?.trim()) {
    chips.push({
      kind: "route",
      label: "Relay",
      value: row.active_bulletin.relay_status.trim(),
    });
  }
  if (row.active_bulletin?.bulletin?.trim()) {
    chips.push({
      kind: "artist",
      label: "Bulletin",
      value: row.active_bulletin.bulletin.trim(),
    });
  }

  if (row.role === "sanctuary") {
    chips.push({
      kind: "sanctuary",
      label: "Zone",
      value: "Sanctuary · no capture",
    });
  }

  if (row.role === "care_loop") {
    chips.push({
      kind: "repair",
      label: "Care loop",
      value: row.public_state.trim() || "Discovery quest",
    });
  }

  if (row.role === "temp_drop") {
    chips.push({
      kind: "drop",
      label: "Drop",
      value: row.public_state.trim() || "Temp drop live",
    });
  }

  if (meta.collective_target != null) {
    const progress = meta.collective_progress ?? 0;
    chips.push({
      kind: "collective",
      label: "City progress",
      value: `${progress} / ${meta.collective_target}`,
    });
  }

  if (meta.scarcity_remaining != null) {
    chips.push({
      kind: "drop",
      label: "Passes",
      value:
        meta.scarcity_remaining === 0
          ? "Closed for the night"
          : `${meta.scarcity_remaining} remaining`,
    });
  }

  if (meta.fragment_id) {
    chips.push({ kind: "finale", label: "Fragment", value: meta.fragment_id });
  }

  if (row.role === "finale") {
    const lattice = fragmentLatticeProgress(meta, seasonFragmentNodeIds());
    chips.push({
      kind: "finale",
      label: "Lattice",
      value: `${lattice.claimed} / ${lattice.required} fragments`,
    });
  }

  if (row.route_open === true) {
    chips.push({ kind: "weather_route", label: "Route", value: "Open tonight" });
  } else if (row.route_open === false && row.active_route) {
    chips.push({ kind: "weather_route", label: "Route", value: "Sealed" });
  }

  if (row.active_route?.relay_route?.trim()) {
    chips.push({
      kind: "chapter",
      label: "Chapter",
      value: row.active_route.relay_route.trim(),
    });
  }

  const vouchChip = mapVouchChipValue(meta, row.vouch_gate);
  if (vouchChip) {
    chips.push({
      kind: "chapter",
      label: "Vouch",
      value: vouchChip,
    });
  } else if (meta.unlocked_by.length && row.role !== "finale") {
    chips.push({
      kind: "chapter",
      label: "Unlocked by",
      value: meta.unlocked_by.join(", "),
    });
  }

  if (!chips.length && row.public_state.trim()) {
    chips.push({
      kind: "ward",
      label: "State",
      value: row.public_state.trim(),
    });
  }

  return chips.slice(0, 4);
}

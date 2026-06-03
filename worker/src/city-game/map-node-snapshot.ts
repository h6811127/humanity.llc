import type { ChildObjectRow } from "../db/types";
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
  resolveGameNodeScanContext,
  type GameNodeScanMode,
} from "./scan-view";
import { seasonWindowChip, type SeasonWindowPhase } from "./season-window";
import { fragmentLatticeProgress } from "./unlock-engine";

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
};

/** Derive aggregate-safe map row from a child object (same precedence as scan SSR). */
export function deriveMapNodeSnapshot(input: {
  child: Pick<
    ChildObjectRow,
    "object_id" | "object_type" | "status" | "public_state" | "child_object_document_json"
  >;
  season: CrSeasonConfig;
  env: { CITY_GAME_ENABLED?: string };
  now: Date;
}): MapNodeSnapshotRow | null {
  if (input.child.object_type !== "game_node") return null;
  const nodeId = seasonNodeIdForObject(input.child.object_id, input.season);
  if (!nodeId) return null;
  const registry = input.season.nodes.find((row) => row.node_id === nodeId);
  if (!registry) return null;

  const fields = parseGameNodeFields(input.child.child_object_document_json);
  if (!fields || fields.seasonId !== input.season.season_id) return null;

  const lifecycle: MapNodeSnapshotRow["lifecycle"] =
    input.child.status === "revoked"
      ? "revoked"
      : input.child.status === "disabled"
        ? "paused"
        : "active";

  const gameNode = resolveGameNodeScanContext({
    objectType: input.child.object_type,
    objectId: input.child.object_id,
    documentJson: input.child.child_object_document_json,
    objectStreams: fields.objectStreams,
    env: input.env,
    season: input.season,
    now: input.now,
  });

  let mapMode: MapNodeSnapshotRow["map_mode"] =
    lifecycle === "revoked" ? "revoked" : (gameNode?.mode ?? "fallback");
  if (lifecycle === "paused") mapMode = "care_pause";

  const activeBulletin =
    registry.role === "relay_gate" && !fields.gameMeta.compromised
      ? resolveActiveBulletinSlot(nodeId, input.now, input.season)
      : null;
  const activeRoute = resolveActiveRouteWindowSlot(nodeId, input.now, input.season);

  let publicState = input.child.public_state;
  if (activeRoute?.public_state?.trim()) {
    publicState = activeRoute.public_state.trim();
  }

  return {
    node_id: nodeId,
    label: registry.label,
    district: registry.district,
    role: registry.role,
    lifecycle,
    map_mode: mapMode,
    public_state: publicState,
    game_meta: fields.gameMeta,
    route_open: activeRoute?.route_open ?? null,
    active_bulletin: activeBulletin,
    active_route: activeRoute,
  };
}

/** Aggregate-safe pin chips for the city board (PWM-MS01–12). */
export function buildMapNodeChips(
  row: MapNodeSnapshotRow,
  seasonWindowPhase: SeasonWindowPhase
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

  if (meta.vouch_requires.length) {
    const met = meta.vouch_requires.every((id) => meta.vouch_active_for.includes(id));
    chips.push({
      kind: "chapter",
      label: "Vouch",
      value: met
        ? "Path open"
        : `Sealed · needs ${meta.vouch_requires.join(", ")}`,
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

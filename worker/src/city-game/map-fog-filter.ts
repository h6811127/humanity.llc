import { resolveActiveBulletinSlot } from "./bulletin-schedule";
import type { GameMeta } from "./game-meta";
import { isGameFaction } from "./factions";
import { applyRelayDecayIfExpired } from "./relay-contribute";
import type { MapNodeSnapshotRow } from "./map-node-snapshot";
import type { CrSeasonConfig } from "./season-config";
import { lorePathUnlocked } from "./witness-gate";

export type MapVisibilityMode = "public" | "signal_war" | "rumor_only";

export type SeasonSignalWarConfig = {
  map_visibility?: MapVisibilityMode | string | null;
  rumored_node_ids?: string[] | null;
  player_guide?: Array<{ title?: string; body?: string }>;
  dual_victory?: {
    network_majority_relay_fraction?: number | null;
  } | null;
};

const COOPERATIVE_BOARD_ROLES = new Set([
  "sanctuary",
  "finale",
  "lore_archive",
  "witness",
  "temp_drop",
  "care_loop",
  "route_splitter",
  "mobile_lore",
]);

function seasonSignalWar(season: CrSeasonConfig): SeasonSignalWarConfig | null {
  const raw = (season as CrSeasonConfig & { signal_war?: SeasonSignalWarConfig }).signal_war;
  return raw && typeof raw === "object" ? raw : null;
}

export function seasonMapVisibility(season: CrSeasonConfig): MapVisibilityMode {
  const mode = seasonSignalWar(season)?.map_visibility?.trim();
  if (mode === "signal_war" || mode === "rumor_only" || mode === "public") {
    return mode;
  }
  return "public";
}

export function seasonConfiguredRumoredNodeIds(season: CrSeasonConfig): string[] {
  const ids = seasonSignalWar(season)?.rumored_node_ids ?? [];
  return ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim());
}

/** Bulletin-active nodes count as rumored for fog (**SW-08**). */
export function rumoredNodeIdsForSeason(
  season: CrSeasonConfig,
  now: Date
): Set<string> {
  const out = new Set(seasonConfiguredRumoredNodeIds(season));
  for (const row of season.nodes) {
    const slot = resolveActiveBulletinSlot(row.node_id, now, season);
    if (slot?.bulletin?.trim() || slot?.relay_status?.trim()) {
      out.add(row.node_id);
    }
  }
  return out;
}

function relayHoldFaction(meta: GameMeta, now: Date): string | null {
  const applied = applyRelayDecayIfExpired(
    { game_meta: meta, object_streams: [], public_state: "" },
    now
  );
  const faction = applied.meta.held_by_faction;
  if (!faction || faction === "neutral" || !isGameFaction(faction)) return null;
  return faction;
}

function hiddenRelayRevealed(row: MapNodeSnapshotRow, now: Date): boolean {
  if (row.game_meta.artifact_id !== "hidden_relay") return true;
  return relayHoldFaction(row.game_meta, now) != null;
}

function relayVisibleOnBoard(
  row: MapNodeSnapshotRow,
  rumored: Set<string>,
  now: Date
): boolean {
  if (row.game_meta.compromised) return true;
  if (rumored.has(row.node_id)) return true;
  if (!hiddenRelayRevealed(row, now)) return false;
  return relayHoldFaction(row.game_meta, now) != null;
}

function cooperativeNodeVisible(row: MapNodeSnapshotRow): boolean {
  return COOPERATIVE_BOARD_ROLES.has(row.role);
}

/**
 * Whether a node row may appear on the public snapshot board (**SW-08**).
 * Rules page place list stays full — fog applies to schematic pins + live rows only.
 */
export function nodeVisibleOnMapBoard(input: {
  row: MapNodeSnapshotRow;
  season: CrSeasonConfig;
  rumored: Set<string>;
  now: Date;
}): boolean {
  const mode = seasonMapVisibility(input.season);
  if (mode === "public") return true;

  if (input.row.role === "relay_gate") {
    return relayVisibleOnBoard(input.row, input.rumored, input.now);
  }

  if (mode === "rumor_only") {
    return input.rumored.has(input.row.node_id);
  }

  if (cooperativeNodeVisible(input.row)) return true;
  return lorePathUnlocked(input.row.game_meta, input.row.vouch_gate);
}

export function filterNodesForMapBoard(input: {
  nodes: MapNodeSnapshotRow[];
  season: CrSeasonConfig;
  now: Date;
}): MapNodeSnapshotRow[] {
  const rumored = rumoredNodeIdsForSeason(input.season, input.now);
  return input.nodes.filter((row) =>
    nodeVisibleOnMapBoard({ row, season: input.season, rumored, now: input.now })
  );
}

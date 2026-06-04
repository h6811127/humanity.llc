import seasonJson from "../../../site/data/city-game-cr-season-01.json";
import type { BulletinScheduleConfig } from "./bulletin-schedule";
import type { RouteWindowScheduleConfig } from "./route-window-schedule";
import {
  networkGraphFromConfig,
  type NetworkGraphAutomation,
  type NetworkGraphEdge,
  type NetworkGraphNode,
} from "../live-object/network-graph";

export type SeasonContributeCode = {
  code: string;
  epoch: string;
};

export type SeasonNodeRow = NetworkGraphNode & {
  node_class?: string;
  faction?: string;
};
export type SeasonUnlockEdge = NetworkGraphEdge;
export type SeasonAutomation = NetworkGraphAutomation;

export type SeasonMobileLoreEnrollment = {
  profile_id: string;
  print_artifact_id: string;
  label: string;
  role?: string;
  enrolled_at?: string;
  fragment_hint?: string | null;
  courier_note?: string | null;
};

export type SeasonWindow = {
  starts_at: string | null;
  ends_at: string | null;
};

export type LiveMapTickerConfig = {
  max_headlines?: number;
};

export type CrSeasonConfig = {
  season_id: string;
  title?: string;
  city?: string;
  status?: string;
  season_root_profile_id?: string | null;
  rules_path?: string;
  auto_rules_page?: boolean;
  /** District slugs for map + game_node validation (city-specific). */
  districts?: string[];
  window?: SeasonWindow;
  nodes: SeasonNodeRow[];
  unlock_edges: SeasonUnlockEdge[];
  contribute_codes?: Record<string, SeasonContributeCode>;
  automation?: SeasonAutomation;
  mobile_lore_enrollment?: SeasonMobileLoreEnrollment[];
  bulletin_schedule?: BulletinScheduleConfig;
  route_window_schedule?: RouteWindowScheduleConfig;
  live_map_ticker?: LiveMapTickerConfig;
};

/** Alias — season config is city-agnostic; CR JSON is the pilot instance. */
export type CitySeasonConfig = CrSeasonConfig;

/** Pilot season JSON — prefer `defaultSeason()` / `resolveSeasonById()` for new code. */
export const CR_SEASON_01 = seasonJson as CrSeasonConfig;

function graphFor(season: CrSeasonConfig) {
  return networkGraphFromConfig(season);
}

export function seasonNodeRow(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): SeasonNodeRow | undefined {
  return season.nodes.find((row) => row.node_id === nodeId);
}

export function seasonNodePledgeFaction(
  nodeId: string | null,
  season: CrSeasonConfig = CR_SEASON_01
): string | null {
  if (!nodeId) return null;
  const row = seasonNodeRow(nodeId, season);
  const faction = row?.faction?.trim();
  return faction || null;
}

export function seasonNodeIdForObject(
  objectId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string | null {
  return graphFor(season).nodeIdForObject(objectId);
}

export function seasonObjectIdForNode(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string | null {
  return graphFor(season).objectIdForNode(nodeId);
}

export function seasonContributeCode(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): SeasonContributeCode | null {
  const entry = season.contribute_codes?.[nodeId];
  if (!entry?.code?.trim()) return null;
  return { code: entry.code.trim(), epoch: entry.epoch?.trim() ?? season.season_id };
}

export function seasonQuorumNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  return graphFor(season).quorumNodeIds();
}

export function seasonFragmentNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  return graphFor(season).fragmentNodeIds();
}

export function seasonFinaleNodeId(season: CrSeasonConfig = CR_SEASON_01): string {
  return graphFor(season).finaleNodeId();
}

export function seasonWitnessScarcityNodeId(season: CrSeasonConfig = CR_SEASON_01): string {
  return graphFor(season).witnessScarcityNodeId();
}

export function seasonContributableNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  return graphFor(season).contributableNodeIds();
}

export function seasonRelayCaptureNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  return graphFor(season).relayCaptureNodeIds();
}

/** False at SW-S1 — relays flip via /game-operator/ only until mid-season. */
export function seasonRelayCapturePlayerEnabled(
  season: CrSeasonConfig = CR_SEASON_01,
  env?: { CITY_GAME_RELAY_CAPTURE_PLAYER?: string }
): boolean {
  if (env?.CITY_GAME_RELAY_CAPTURE_PLAYER === "1") return true;
  return graphFor(season).relayCapturePlayerEnabled();
}

export function seasonRelayDecayHours(season: CrSeasonConfig = CR_SEASON_01): number {
  return graphFor(season).relayDecayHours();
}

export function seasonVouchTargetsFrom(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string[] {
  return graphFor(season).vouchTargetsFrom(nodeId);
}

export function seasonUnlockEdgesFrom(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): SeasonUnlockEdge[] {
  return graphFor(season).unlockEdgesFrom(nodeId);
}

export function normalizeSiteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function findSeasonMobileLoreEnrollment(
  profileId: string,
  printArtifactId: string | null | undefined,
  rows: SeasonMobileLoreEnrollment[] = CR_SEASON_01.mobile_lore_enrollment ?? []
): SeasonMobileLoreEnrollment | null {
  if (!printArtifactId?.trim()) return null;
  const id = printArtifactId.trim();
  return (
    rows.find((row) => row.profile_id === profileId && row.print_artifact_id === id) ??
    null
  );
}

export { validateNetworkGraph, networkGraphFromConfig } from "../live-object/network-graph";

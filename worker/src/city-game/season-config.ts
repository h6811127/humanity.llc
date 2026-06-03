import seasonJson from "../../../site/data/city-game-cr-season-01.json";
import type { BulletinScheduleConfig } from "./bulletin-schedule";
import type { RouteWindowScheduleConfig } from "./route-window-schedule";

export type SeasonContributeCode = {
  code: string;
  epoch: string;
};

export type SeasonNodeRow = {
  node_id: string;
  object_id: string;
  role: string;
  district: string;
  label: string;
};

export type SeasonUnlockEdge = {
  from: string;
  to: string;
  label: string;
};

export type SeasonAutomation = {
  quorum_nodes?: string[];
  fragment_nodes?: string[];
  finale_node?: string;
  witness_scarcity_node?: string;
};

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

type SeasonIndexes = {
  objectToNode: Map<string, string>;
  nodeToObject: Map<string, string>;
};

const indexCache = new WeakMap<CrSeasonConfig, SeasonIndexes>();

function indexesFor(season: CrSeasonConfig): SeasonIndexes {
  let cached = indexCache.get(season);
  if (!cached) {
    cached = {
      objectToNode: new Map(season.nodes.map((n) => [n.object_id, n.node_id] as const)),
      nodeToObject: new Map(season.nodes.map((n) => [n.node_id, n.object_id] as const)),
    };
    indexCache.set(season, cached);
  }
  return cached;
}

export function seasonNodeIdForObject(
  objectId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string | null {
  return indexesFor(season).objectToNode.get(objectId) ?? null;
}

export function seasonObjectIdForNode(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string | null {
  return indexesFor(season).nodeToObject.get(nodeId) ?? null;
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
  return season.automation?.quorum_nodes ?? ["node_04"];
}

export function seasonFragmentNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  return season.automation?.fragment_nodes ?? [];
}

export function seasonFinaleNodeId(season: CrSeasonConfig = CR_SEASON_01): string {
  return season.automation?.finale_node ?? "node_13";
}

export function seasonWitnessScarcityNodeId(season: CrSeasonConfig = CR_SEASON_01): string {
  return season.automation?.witness_scarcity_node ?? "node_10";
}

export function seasonContributableNodeIds(season: CrSeasonConfig = CR_SEASON_01): string[] {
  const ids = new Set([
    ...seasonQuorumNodeIds(season),
    ...seasonFragmentNodeIds(season),
    seasonWitnessScarcityNodeId(season),
  ]);
  return [...ids];
}

export function seasonVouchTargetsFrom(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): string[] {
  return seasonUnlockEdgesFrom(nodeId, season).map((edge) => edge.to);
}

export function seasonUnlockEdgesFrom(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): SeasonUnlockEdge[] {
  return season.unlock_edges.filter((e) => e.from === nodeId);
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

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
  /** Location weight for Signal War network score (**SW-06**). */
  points_per_hour?: number;
};
export type SeasonUnlockEdge = NetworkGraphEdge;
export type SeasonAutomation = NetworkGraphAutomation;

export type SeasonPrintArtifactEnrollment = {
  profile_id: string;
  print_artifact_id: string;
  label: string;
  role?: "mobile_lore" | "faction_badge" | string;
  enrolled_at?: string;
  fragment_hint?: string | null;
  courier_note?: string | null;
  /** SW-15 — public faction line on badge scan */
  faction?: string | null;
  mission_line?: string | null;
  achievement_lines?: string[] | null;
};

/** @deprecated Alias — same array as faction badges in `mobile_lore_enrollment`. */
export type SeasonMobileLoreEnrollment = SeasonPrintArtifactEnrollment;

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

/** Canonical city board URL for a season (shareable, no hash). */
export function seasonBoardPath(rulesPath: string | null | undefined): string | null {
  const trimmed = String(rulesPath ?? "").trim();
  const match = trimmed.match(/^\/play\/([^/]+)\/?$/);
  return match?.[1] ? `/play/${match[1]}/map/` : null;
}

/** Board URL with scanned node deep link (`?node=`). */
export function seasonBoardPathWithNode(
  rulesPath: string | null | undefined,
  nodeId?: string | null
): string | null {
  const base = seasonBoardPath(rulesPath);
  if (!base) return null;
  const id = String(nodeId ?? "").trim();
  return id ? `${base}?node=${encodeURIComponent(id)}` : base;
}

const GAME_SCAN_PRIVACY_TAGLINE_DEFAULT = "No account. No GPS. No visit log.";

/** Player-facing privacy punchline from season map copy, with pilot default. */
export function gameScanPrivacyTagline(season: CrSeasonConfig | null | undefined): string {
  const fromSeason = (season as { map_copy?: { privacy_note?: string } } | null | undefined)
    ?.map_copy?.privacy_note?.trim();
  return fromSeason || GAME_SCAN_PRIVACY_TAGLINE_DEFAULT;
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

/** SW-06 — location-weighted relay value for network totals. */
export function seasonRelayPointsPerHour(
  nodeId: string,
  season: CrSeasonConfig = CR_SEASON_01
): number | null {
  const fromAuto = season.automation?.relay_points_per_hour?.[nodeId];
  if (typeof fromAuto === "number" && Number.isFinite(fromAuto) && fromAuto > 0) {
    return Math.min(Math.floor(fromAuto), 10_000);
  }
  const row = seasonNodeRow(nodeId, season);
  if (
    typeof row?.points_per_hour === "number" &&
    Number.isFinite(row.points_per_hour) &&
    row.points_per_hour > 0
  ) {
    return Math.min(Math.floor(row.points_per_hour), 10_000);
  }
  return null;
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

export function findSeasonPrintArtifactEnrollment(
  profileId: string,
  printArtifactId: string | null | undefined,
  role: "mobile_lore" | "faction_badge" | null = null,
  rows: SeasonPrintArtifactEnrollment[] = CR_SEASON_01.mobile_lore_enrollment ?? []
): SeasonPrintArtifactEnrollment | null {
  if (!printArtifactId?.trim()) return null;
  const id = printArtifactId.trim();
  return (
    rows.find((row) => {
      if (row.profile_id !== profileId || row.print_artifact_id !== id) return false;
      if (!role) return true;
      const rowRole = row.role?.trim() || "mobile_lore";
      return rowRole === role;
    }) ?? null
  );
}

export function findSeasonMobileLoreEnrollment(
  profileId: string,
  printArtifactId: string | null | undefined,
  rows: SeasonMobileLoreEnrollment[] = CR_SEASON_01.mobile_lore_enrollment ?? []
): SeasonMobileLoreEnrollment | null {
  return findSeasonPrintArtifactEnrollment(
    profileId,
    printArtifactId,
    "mobile_lore",
    rows
  );
}

export { validateNetworkGraph, networkGraphFromConfig } from "../live-object/network-graph";

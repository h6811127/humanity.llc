/**
 * Object-field context view — members + snapshot ref + filters + comprehension spine.
 * Cedar Rapids map board is one context instance (network lens + game overlay skin).
 * @see docs/DISCOVERY_PROJECTION.md · docs/CITY_GAME_MAP_DASHBOARD.md
 */

import {
  comprehensionPrimaryNodeId,
  resolveComprehensionProbeNodes,
} from "./city-game-player-guide-core.mjs";
import { buildTypeFilterOptions, TYPE_FILTER_CHIPS } from "./city-game-map-type-filter-core.mjs";

export const BOARD_CONTEXT_KIND_NETWORK = "network";
export const BOARD_SNAPSHOT_PATH_PREFIX = "/.well-known/hc/v1/seasons/";
export const BOARD_SNAPSHOT_POLL_MS = 90_000;

/**
 * @param {Record<string, unknown>} season
 * @returns {Record<string, { x: number; y: number }>}
 */
function layoutPositions(season) {
  const layout = season.map_layout;
  if (!layout || typeof layout !== "object") return {};
  const nodes = /** @type {Record<string, { x: number; y: number }>} */ (layout.nodes ?? {});
  return nodes && typeof nodes === "object" ? nodes : {};
}

/**
 * @param {Record<string, unknown>} season
 */
function seasonNodeRows(season) {
  return Array.isArray(season.nodes) ? season.nodes : [];
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} seasonId
 */
export function resolveBoardContextSnapshotRef(season, seasonId = String(season.season_id ?? "").trim()) {
  const id = seasonId || String(season.season_id ?? "").trim();
  return {
    season_id: id,
    poll_ms: BOARD_SNAPSHOT_POLL_MS,
    path: `${BOARD_SNAPSHOT_PATH_PREFIX}${encodeURIComponent(id)}/snapshot`,
  };
}

/**
 * Comprehension spine — primary entry + probe list from season comprehension_kit.
 * @param {Record<string, unknown>} season
 */
export function resolveBoardContextSpine(season) {
  const primaryEntryId = comprehensionPrimaryNodeId(season);
  const probes = resolveComprehensionProbeNodes(season).map((row) => ({
    entry_id: String(row.node_id ?? ""),
    label: String(row.label ?? row.node_id ?? ""),
    blurb: String(row.blurb ?? ""),
  }));
  return {
    primary_entry_id: primaryEntryId,
    probe_entries: probes,
  };
}

/**
 * Filter config for the context view (type chips + state toolbar flag).
 * @param {Record<string, unknown>} season
 */
export function resolveBoardContextFilters(season) {
  const mapBoard = season.map_board;
  const exploreBy =
    mapBoard && typeof mapBoard === "object" && mapBoard.explore_by && typeof mapBoard.explore_by === "object"
      ? /** @type {{ label?: string; types?: Record<string, { label?: string; order?: number }> }} */ (
          mapBoard.explore_by
        )
      : null;
  const configuredTypes = exploreBy?.types && typeof exploreBy.types === "object" ? exploreBy.types : {};
  const typeOptions = buildTypeFilterOptions(season);
  const categories = typeOptions.map((chip) => {
    const configured = configuredTypes[chip.id];
    return {
      id: chip.id,
      label: configured?.label?.trim() || chip.label,
      count: chip.count,
      order: typeof configured?.order === "number" ? configured.order : null,
    };
  });
  return {
    explore_label: exploreBy?.label?.trim() || "Explore by",
    categories,
    state_filters: true,
    type_chips: TYPE_FILTER_CHIPS.map((chip) => ({
      id: chip.id,
      label: chip.label,
      roles: chip.roles ?? null,
      special: chip.special ?? null,
    })),
  };
}

/**
 * Neutral member rows enrolled in this context (season nodes today).
 * @param {Record<string, unknown>} season
 */
export function resolveBoardContextMembers(season) {
  const positions = layoutPositions(season);
  return seasonNodeRows(season).map((row) => {
    const entryId = String(row?.node_id ?? "").trim();
    const objectId =
      typeof row?.object_id === "string" && row.object_id.trim() ? row.object_id.trim() : null;
    const label = String(row?.label ?? entryId).trim();
    const category = String(row?.role ?? "").trim();
    const group = String(row?.district ?? "").trim() || null;
    const pos = entryId ? positions[entryId] : null;
    const layout =
      pos && typeof pos.x === "number" && typeof pos.y === "number"
        ? { x: pos.x, y: pos.y }
        : null;
    const scanUrl =
      typeof row?.scan_url === "string" && row.scan_url.trim() ? row.scan_url.trim() : null;
    const mapsQuery =
      typeof row?.maps_query === "string" && row.maps_query.trim() ? row.maps_query.trim() : null;
    return {
      entry_id: entryId,
      object_id: objectId,
      label,
      category,
      group,
      layout,
      scan_url: scanUrl,
      maps_query: mapsQuery,
    };
  }).filter((row) => row.entry_id);
}

/**
 * Cross-member dependency hints (unlock edges today).
 * @param {Record<string, unknown>} season
 */
export function resolveBoardContextEdges(season) {
  const edges = Array.isArray(season.unlock_edges) ? season.unlock_edges : [];
  return edges
    .map((edge) => ({
      from_entry_id: String(edge?.from ?? "").trim(),
      to_entry_id: String(edge?.to ?? "").trim(),
      label: typeof edge?.label === "string" ? edge.label.trim() : "",
    }))
    .filter((edge) => edge.from_entry_id && edge.to_entry_id);
}

/**
 * Full context view contract for map board surfaces.
 * @param {Record<string, unknown>} season
 */
export function resolveBoardContextView(season) {
  const seasonId = String(season.season_id ?? "").trim();
  const listing =
    season.public_listing && typeof season.public_listing === "object"
      ? /** @type {{ title?: string; summary?: string; region?: string; category?: string }} */ (
          season.public_listing
        )
      : null;
  const mapCopy =
    season.map_copy && typeof season.map_copy === "object"
      ? /** @type {{ title?: string }} */ (season.map_copy)
      : null;
  const title =
    listing?.title?.trim() ||
    mapCopy?.title?.trim() ||
      String(season.title ?? (seasonId || "Context view")).trim();
  const contextKind =
    listing?.category?.trim() === "city_games"
      ? BOARD_CONTEXT_KIND_NETWORK
      : BOARD_CONTEXT_KIND_NETWORK;

  return {
    context_id: seasonId,
    context_kind: contextKind,
    title,
    region: listing?.region?.trim() || String(season.city ?? "").trim() || null,
    members: resolveBoardContextMembers(season),
    edges: resolveBoardContextEdges(season),
    filters: resolveBoardContextFilters(season),
    spine: resolveBoardContextSpine(season),
    snapshot: resolveBoardContextSnapshotRef(season, seasonId),
  };
}

/**
 * Lookup a member by entry id (node_id).
 * @param {ReturnType<typeof resolveBoardContextView>} context
 * @param {string} entryId
 */
export function boardContextMember(context, entryId) {
  const id = String(entryId ?? "").trim();
  if (!id) return null;
  return context.members.find((row) => row.entry_id === id) ?? null;
}

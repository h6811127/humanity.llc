/**
 * Network lens config — transit map presentation over season pins.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § Network lens
 */

import { comprehensionPrimaryNodeId } from "./city-game-player-guide-core.mjs";

/** Default cooperative express spine when season JSON omits network_lens.play_spine. */
export const DEFAULT_PLAY_SPINE = ["node_04", "node_07", "node_09", "node_11", "node_13"];

/**
 * @param {Record<string, unknown>} season
 */
function seasonNodeIds(season) {
  const rows = Array.isArray(season?.nodes) ? season.nodes : [];
  return new Set(rows.map((row) => String(row?.node_id ?? "").trim()).filter(Boolean));
}

/**
 * Derive play spine from automation block when network_lens is absent.
 * @param {Record<string, unknown>} season
 */
export function derivePlaySpineNodeIds(season) {
  const ids = new Set(seasonNodeIds(season));
  const auto =
    season.automation && typeof season.automation === "object"
      ? /** @type {Record<string, unknown>} */ (season.automation)
      : null;
  const picked = [
    comprehensionPrimaryNodeId(season),
    auto?.finale_node,
    ...(Array.isArray(auto?.fragment_nodes) ? auto.fragment_nodes : []),
    ...(Array.isArray(auto?.quorum_nodes) ? auto.quorum_nodes : []),
  ]
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  const ordered = [];
  for (const id of DEFAULT_PLAY_SPINE) {
    if (ids.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  for (const id of picked) {
    if (ids.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  return ordered.length ? ordered : [...DEFAULT_PLAY_SPINE].filter((id) => ids.has(id));
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveNetworkLens(season) {
  const block =
    season.network_lens && typeof season.network_lens === "object"
      ? /** @type {Record<string, unknown>} */ (season.network_lens)
      : null;

  const playSpineRaw = Array.isArray(block?.play_spine) ? block.play_spine : null;
  const playSpine = (playSpineRaw ?? derivePlaySpineNodeIds(season))
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);

  const nextRaw =
    typeof block?.next_node_id === "string" && block.next_node_id.trim()
      ? block.next_node_id.trim()
      : comprehensionPrimaryNodeId(season);

  const defaultListRaw = typeof block?.default_list === "string" ? block.default_list.trim() : "spine";
  const defaultList = defaultListRaw === "all" ? "all" : "spine";

  const expressEdges = Array.isArray(block?.express_edges)
    ? block.express_edges.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  return {
    play_spine: playSpine,
    default_list: defaultList,
    next_node_id: nextRaw,
    contest_layer: block?.contest_layer !== false,
    express_edges: expressEdges,
    configured: Boolean(block),
    copy: resolveNetworkLensCopy(season),
  };
}

/** Default player-facing strings for network lens (overridden by season JSON). */
export const DEFAULT_NETWORK_LENS_COPY = {
  start_callout_kicker: "Suggested first stop",
  start_callout_title_prefix: "Try here",
  start_callout_why:
    "Any game sticker works — this place is a good starting point. Scan the sticker there for live status.",
  next_pin_label: "Start",
  drawer_summary: "Routes and connections",
  legend_title: "Key route stops",
  legend_intro:
    "Main stops on the suggested route — scan any sticker for live status.",
  list_lens_spine_label: "Route stops",
  list_lens_all_label: "All places",
  list_lens_aria: "Which places to show",
  selection_kicker: "Selected place",
};

/**
 * @param {Record<string, unknown>} season
 */
export function resolveNetworkLensCopy(season) {
  const block =
    season.network_lens && typeof season.network_lens === "object"
      ? /** @type {Record<string, unknown>} */ (season.network_lens)
      : null;
  const raw =
    block?.copy && typeof block.copy === "object"
      ? /** @type {Record<string, unknown>} */ (block.copy)
      : {};
  const mapCopy =
    season.map_copy && typeof season.map_copy === "object"
      ? /** @type {Record<string, unknown>} */ (season.map_copy)
      : {};

  const pick = (key, fallback) => {
    const fromLens = typeof raw[key] === "string" ? raw[key].trim() : "";
    if (fromLens) return fromLens;
    const fromMap = typeof mapCopy[key] === "string" ? mapCopy[key].trim() : "";
    if (fromMap) return fromMap;
    return fallback;
  };

  return {
    start_callout_kicker: pick("start_callout_kicker", DEFAULT_NETWORK_LENS_COPY.start_callout_kicker),
    start_callout_title_prefix: pick(
      "start_callout_title_prefix",
      DEFAULT_NETWORK_LENS_COPY.start_callout_title_prefix
    ),
    start_callout_why: pick("start_callout_why", DEFAULT_NETWORK_LENS_COPY.start_callout_why),
    next_pin_label: pick("next_pin_label", DEFAULT_NETWORK_LENS_COPY.next_pin_label),
    drawer_summary: pick("drawer_summary", DEFAULT_NETWORK_LENS_COPY.drawer_summary),
    legend_title: pick("legend_title", DEFAULT_NETWORK_LENS_COPY.legend_title),
    legend_intro: pick("legend_intro", DEFAULT_NETWORK_LENS_COPY.legend_intro),
    list_lens_spine_label: pick("list_lens_spine_label", DEFAULT_NETWORK_LENS_COPY.list_lens_spine_label),
    list_lens_all_label: pick("list_lens_all_label", DEFAULT_NETWORK_LENS_COPY.list_lens_all_label),
    list_lens_aria: pick("list_lens_aria", DEFAULT_NETWORK_LENS_COPY.list_lens_aria),
    selection_kicker: pick("selection_kicker", DEFAULT_NETWORK_LENS_COPY.selection_kicker),
  };
}

/**
 * @param {Record<string, unknown>} season
 * @param {string | null | undefined} nodeId
 */
export function isNetworkLensSpineNode(season, nodeId) {
  const id = String(nodeId ?? "").trim();
  if (!id) return false;
  return resolveNetworkLens(season).play_spine.includes(id);
}

/**
 * @param {Record<string, unknown>} season
 */
export function networkLensNextNodeId(season) {
  return resolveNetworkLens(season).next_node_id;
}

/**
 * @param {Record<string, unknown>} season
 * @param {string[]} [issues]
 */
export function validateNetworkLens(season, issues = []) {
  const lens = resolveNetworkLens(season);
  const nodeIds = seasonNodeIds(season);
  for (const nodeId of lens.play_spine) {
    if (!nodeIds.has(nodeId)) {
      issues.push(`network_lens.play_spine references unknown node_id ${nodeId}.`);
    }
  }
  if (lens.next_node_id && !nodeIds.has(lens.next_node_id)) {
    issues.push(`network_lens.next_node_id references unknown node_id ${lens.next_node_id}.`);
  }
  if (!lens.play_spine.includes(lens.next_node_id)) {
    issues.push(
      `network_lens.next_node_id (${lens.next_node_id}) should appear in play_spine for GT-8 orientation.`
    );
  }
  return issues;
}

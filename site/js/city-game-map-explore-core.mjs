/**
 * City board — Explore By filter (E0): role chips with counts, AND-composed with district filter.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

/** Fallback labels when season map_board.explore_by.types omits a role. */
export const EXPLORE_ROLE_LABELS = {
  relay_gate: "Relay spot",
  lore_archive: "Story archive",
  sanctuary: "Regroup spot",
  temp_drop: "Clue drop",
  witness: "Sunset spot",
  route_splitter: "Route choice",
  finale: "Finale",
  care_loop: "Care spot",
  mobile_lore: "Moving story",
};

/** Default chip order when config omits order. */
export const EXPLORE_ROLE_ORDER = [
  "relay_gate",
  "lore_archive",
  "sanctuary",
  "temp_drop",
  "witness",
  "route_splitter",
  "finale",
  "care_loop",
  "mobile_lore",
];

/**
 * @param {Record<string, unknown>} season
 * @returns {Map<string, number>}
 */
export function countNodesByRole(season) {
  const rows = Array.isArray(season?.nodes) ? season.nodes : [];
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const row of rows) {
    const role = typeof row?.role === "string" ? row.role.trim() : "";
    if (!role) continue;
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {{ label: string; types: Record<string, { label?: string; order?: number }> } | null}
 */
function readExploreByConfig(season) {
  const mapBoard = season?.map_board;
  if (!mapBoard || typeof mapBoard !== "object") return null;
  const exploreBy = /** @type {{ label?: string; types?: Record<string, unknown> }} */ (
    mapBoard.explore_by
  );
  if (!exploreBy || typeof exploreBy !== "object") return null;
  const types =
    exploreBy.types && typeof exploreBy.types === "object"
      ? /** @type {Record<string, { label?: string; order?: number }>} */ (exploreBy.types)
      : {};
  const label =
    typeof exploreBy.label === "string" && exploreBy.label.trim()
      ? exploreBy.label.trim()
      : "Explore by";
  return { label, types };
}

/**
 * @param {string} roleId
 * @param {Record<string, { label?: string; order?: number }>} configTypes
 */
function exploreLabelForRole(roleId, configTypes) {
  const configured = configTypes[roleId]?.label?.trim();
  if (configured) return configured;
  return EXPLORE_ROLE_LABELS[roleId] ?? roleId.replace(/_/g, " ");
}

/**
 * @param {string} roleId
 * @param {Record<string, { label?: string; order?: number }>} configTypes
 */
function exploreOrderForRole(roleId, configTypes) {
  const configured = configTypes[roleId]?.order;
  if (typeof configured === "number" && Number.isFinite(configured)) return configured;
  const idx = EXPLORE_ROLE_ORDER.indexOf(roleId);
  return idx >= 0 ? idx : 999;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {Array<{ id: string; label: string; count: number }>}
 */
export function buildExploreFilterOptions(season) {
  const config = readExploreByConfig(season);
  const configTypes = config?.types ?? {};
  const counts = countNodesByRole(season);

  const options = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id,
      label: exploreLabelForRole(id, configTypes),
      count,
      order: exploreOrderForRole(id, configTypes),
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(({ id, label, count }) => ({ id, label, count }));

  return options;
}

/**
 * @param {Record<string, unknown>} season
 */
export function exploreFilterToolbarLabel(season) {
  return readExploreByConfig(season)?.label ?? "Explore by";
}

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * @param {Record<string, unknown>} season
 * @returns {string}
 */
export function buildExploreFilterHtml(season) {
  const options = buildExploreFilterOptions(season);
  if (!options.length) return "";

  const toolbarLabel = exploreFilterToolbarLabel(season);
  const chips = [
    `<button type="button" class="city-game-map-filter-btn city-game-map-filter-btn--active" data-explore-filter="all" data-filter-label="All kinds" aria-pressed="true">All kinds</button>`,
    ...options.map(
      (o) =>
        `<button type="button" class="city-game-map-filter-btn" data-explore-filter="${escapeAttr(o.id)}" data-filter-label="${escapeAttr(o.label)}" aria-pressed="false">${escapeAttr(o.label)} <span class="city-game-map-filter-btn-count">${o.count}</span></button>`
    ),
  ].join("");
  return `<div class="city-game-map-explore-filter" role="toolbar" aria-label="${escapeAttr(toolbarLabel)}">
  <span class="city-game-map-filter-label">${escapeAttr(toolbarLabel)}</span>
  <div class="city-game-map-filter-chips">${chips}</div>
</div>`;
}

/**
 * @param {string | null | undefined} districtId
 * @param {string | null | undefined} activeDistrict
 */
export function matchesDistrictFilter(districtId, activeDistrict) {
  if (!activeDistrict || activeDistrict === "all") return true;
  return String(districtId ?? "") === activeDistrict;
}

/**
 * @param {string | null | undefined} roleId
 * @param {string | null | undefined} activeExplore
 */
export function matchesExploreFilter(roleId, activeExplore) {
  if (!activeExplore || activeExplore === "all") return true;
  return String(roleId ?? "") === activeExplore;
}

/**
 * @param {{ district?: string | null; role?: string | null }} node
 * @param {{ activeDistrict?: string | null; activeExplore?: string | null }} filters
 */
export function matchesBoardNodeFilters(node, filters) {
  const activeDistrict =
    filters.activeDistrict && filters.activeDistrict !== "all"
      ? filters.activeDistrict
      : null;
  const activeExplore =
    filters.activeExplore && filters.activeExplore !== "all" ? filters.activeExplore : null;
  if (!matchesDistrictFilter(node.district, activeDistrict)) return false;
  if (!matchesExploreFilter(node.role, activeExplore)) return false;
  return true;
}

/**
 * @param {string | null | undefined} activeDistrict
 * @param {string | null | undefined} activeExplore
 */
export function normalizeBoardFilterState(activeDistrict, activeExplore) {
  return {
    activeDistrict:
      activeDistrict && activeDistrict !== "all" ? String(activeDistrict) : null,
    activeExplore:
      activeExplore && activeExplore !== "all" ? String(activeExplore) : null,
  };
}

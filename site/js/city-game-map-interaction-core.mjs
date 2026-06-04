/**
 * M4 map board interaction — pure helpers (testable).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § M4
 */

export const CITY_GAME_MAP_DENSE_NODE_THRESHOLD = 25;

const DISTRICT_LABELS = {
  newbo: "NewBo",
  czech_village: "Czech Village",
  greene_square: "Greene Square",
  river_spine: "River spine",
  downtown: "Downtown",
};

/**
 * @param {Record<string, unknown>} season
 */
export function isDenseMapBoard(season) {
  const nodes = Array.isArray(season?.nodes) ? season.nodes : [];
  return nodes.length >= CITY_GAME_MAP_DENSE_NODE_THRESHOLD;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {Array<{ id: string; label: string }>}
 */
export function buildDistrictFilterOptions(season) {
  const districts = Array.isArray(season?.districts) ? season.districts : [];
  /** @type {Record<string, string>} */
  const labels =
    season?.map_board?.district_labels &&
    typeof season.map_board.district_labels === "object"
      ? season.map_board.district_labels
      : {};

  return districts.map((id) => ({
    id: String(id),
    label:
      labels[id] ?? DISTRICT_LABELS[id] ?? formatDistrictId(String(id)),
  }));
}

/**
 * @param {string} districtId
 */
export function formatDistrictId(districtId) {
  return districtId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
export function buildDistrictFilterHtml(season) {
  const options = buildDistrictFilterOptions(season);
  const chips = [
    `<button type="button" class="city-game-map-filter-btn city-game-map-filter-btn--active" data-district-filter="all" aria-pressed="true">All districts</button>`,
    ...options.map(
      (o) =>
        `<button type="button" class="city-game-map-filter-btn" data-district-filter="${escapeAttr(o.id)}" aria-pressed="false">${escapeAttr(o.label)}</button>`
    ),
  ].join("");
  return `<div class="city-game-map-filter" role="toolbar" aria-label="Filter places by district">${chips}</div>`;
}

/**
 * M4 map board interaction — pure helpers (testable).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md § M4
 */

export const CITY_GAME_MAP_DENSE_NODE_THRESHOLD = 25;

/** Match styles.css mobile stack — list above sketch, scroll sketch on row select. */
export const CITY_GAME_MAP_MOBILE_SKETCH_MEDIA =
  "(max-width: 959px), (hover: none), (pointer: coarse)";

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
    `<button type="button" class="city-game-map-filter-btn" data-district-filter="all" data-filter-label="All districts" aria-pressed="true">All districts</button>`,
    ...options.map(
      (o) =>
        `<button type="button" class="city-game-map-filter-btn" data-district-filter="${escapeAttr(o.id)}" data-filter-label="${escapeAttr(o.label)}" aria-pressed="false">${escapeAttr(o.label)}</button>`
    ),
  ].join("");
  return `<div class="city-game-map-district-filter city-game-map-filter" role="toolbar" aria-label="Filter places by district">
  <span class="city-game-map-filter-label">District</span>
  <div class="city-game-map-filter-chips">${chips}</div>
</div>`;
}

/**
 * Toggle off when the same node is selected again.
 * @param {string | null | undefined} currentNodeId
 * @param {string | null | undefined} clickedNodeId
 * @returns {string | null}
 */
/**
 * Read `?node=` deep link from a board URL search string.
 * @param {string} [search]
 * @returns {string | null}
 */
export function readMapBoardNodeQueryParam(search = "") {
  const raw = String(search ?? "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const node = params.get("node")?.trim();
  return node || null;
}

const MAP_BOARD_TYPE_FILTER_IDS = new Set([
  "all",
  "relay_gate",
  "lore",
  "witness",
  "sanctuary",
  "care_loop",
  "finale",
  "hidden",
]);

const MAP_BOARD_STATE_FILTER_IDS = new Set([
  "all",
  "needs_action",
  "unlocked",
  "locked",
  "changed_recently",
  "care_paused",
  "compromised",
  "sanctuary_open",
]);

/**
 * @param {string | null | undefined} value
 * @param {Set<string>} allowed
 * @returns {string}
 */
export function normalizeMapBoardFilterParam(value, allowed) {
  const id = String(value ?? "").trim();
  if (!id || id === "all") return "all";
  return allowed.has(id) ? id : "all";
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeMapBoardDistrictParam(value) {
  const id = String(value ?? "").trim();
  if (!id || id === "all") return "all";
  return /^[a-z0-9_]+$/i.test(id) ? id : "all";
}

/**
 * @param {string} [search]
 * @returns {{ node: string | null; type: string; state: string; district: string }}
 */
export function readMapBoardQueryState(search = "") {
  const raw = String(search ?? "").trim();
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const node = params.get("node")?.trim() || null;
  const type = normalizeMapBoardFilterParam(params.get("type"), MAP_BOARD_TYPE_FILTER_IDS);
  const state = normalizeMapBoardFilterParam(params.get("state"), MAP_BOARD_STATE_FILTER_IDS);
  const district = normalizeMapBoardDistrictParam(params.get("district"));
  return { node, type, state, district };
}

/**
 * @param {string} pathname
 * @param {{ node?: string | null; type?: string; state?: string; district?: string }} state
 * @returns {string}
 */
export function buildMapBoardSharePath(pathname, state = {}) {
  const path = String(pathname ?? "").trim() || "/";
  const params = new URLSearchParams();
  const node = String(state.node ?? "").trim();
  const type = String(state.type ?? "all").trim() || "all";
  const boardState = String(state.state ?? "all").trim() || "all";
  const district = String(state.district ?? "all").trim() || "all";
  if (node) params.set("node", node);
  if (type && type !== "all") params.set("type", type);
  if (boardState && boardState !== "all") params.set("state", boardState);
  if (district && district !== "all") params.set("district", district);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * @param {string} pathname
 * @param {{ node?: string | null; type?: string; state?: string; district?: string }} state
 * @param {string} [origin]
 * @returns {string}
 */
export function buildMapBoardAbsoluteShareUrl(pathname, state = {}, origin = "") {
  const base = String(origin ?? "").replace(/\/$/, "");
  const path = buildMapBoardSharePath(pathname, state);
  return base ? `${base}${path}` : path;
}

/**
 * @param {{ dataset?: DOMStringMap }} boardRoot
 * @returns {{ node: string | null; type: string; state: string; district: string }}
 */
export function readMapBoardShareStateFromRoot(boardRoot) {
  const node = boardRoot?.dataset?.highlightNodeId?.trim() || null;
  const type = boardRoot?.dataset?.activeType ?? boardRoot?.dataset?.activeExplore ?? "all";
  const state = boardRoot?.dataset?.activeState ?? "all";
  const district = boardRoot?.dataset?.activeDistrict ?? "all";
  return {
    node,
    type: String(type || "all"),
    state: String(state || "all"),
    district: String(district || "all"),
  };
}

export function resolveMapNodeHighlight(currentNodeId, clickedNodeId) {
  const id = String(clickedNodeId ?? "").trim();
  if (!id) return null;
  if (currentNodeId === id) return null;
  return id;
}

/**
 * Filter-hidden and [hidden] pins are not interactive; snapshot fog stays hittable.
 * @param {{ hidden?: boolean; hasAttribute?: (name: string) => boolean } | null | undefined} pin
 */
export function isMapPinInteractive(pin) {
  if (!pin) return false;
  if (pin.hidden) return false;
  if (typeof pin.hasAttribute === "function" && pin.hasAttribute("hidden")) return false;
  return true;
}

/**
 * @param {(query: string) => boolean} matchMedia
 */
export function shouldScrollSketchForRowFocus(matchMedia) {
  return matchMedia(CITY_GAME_MAP_MOBILE_SKETCH_MEDIA);
}

/**
 * Places-section sketch above the list; falls back to advanced district sketch.
 * @param {{ querySelector?: (sel: string) => Element | null }} boardRoot
 * @returns {HTMLElement | null}
 */
export function resolvePrimarySketchFigure(boardRoot) {
  if (!boardRoot || typeof boardRoot.querySelector !== "function") return null;
  const mobile = boardRoot.querySelector(".city-game-map-mobile-sketch");
  if (mobile) return /** @type {HTMLElement} */ (mobile);
  const district = boardRoot.querySelector("#district-sketch .city-game-map-figure");
  return district ? /** @type {HTMLElement} */ (district) : null;
}

/**
 * Prefer the mobile-sketch pin when both mobile and advanced sketches exist.
 * @param {{ querySelector?: (sel: string) => Element | null }} boardRoot
 * @param {string | null | undefined} nodeId
 * @returns {Element | null}
 */
export function resolveSketchPin(boardRoot, nodeId) {
  const id = String(nodeId ?? "").trim();
  if (!id || !boardRoot || typeof boardRoot.querySelector !== "function") return null;
  const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id;
  const mobilePin = boardRoot.querySelector(
    `.city-game-map-mobile-sketch .city-game-map-pin[data-node-id="${esc}"]`
  );
  if (mobilePin) return mobilePin;
  return boardRoot.querySelector(`.city-game-map-pin[data-node-id="${esc}"]`);
}

/**
 * @param {string | null | undefined} title
 * @param {string | null | undefined} meta
 * @returns {{ title: string; meta: string }}
 */
export function resolveSelectionBarCopy(title, meta) {
  const resolvedTitle = String(title ?? "").trim();
  const resolvedMeta = String(meta ?? "").trim();
  return {
    title: resolvedTitle || "Selected place",
    meta: resolvedMeta,
  };
}

/**
 * Hidden until a place is selected; lives between mobile sketch and list scroll.
 * @returns {string}
 */
export function buildMapSelectionBarHtml() {
  return `<div class="city-game-map-selection-bar" data-selection-bar hidden role="region" aria-label="Selected place" aria-live="polite">
  <div class="city-game-map-selection-bar-main">
    <p class="city-game-map-selection-bar-kicker">Selected place</p>
    <p class="city-game-map-selection-bar-title" data-selection-title></p>
    <p class="city-game-map-selection-bar-meta" data-selection-meta hidden></p>
  </div>
  <div class="city-game-map-selection-bar-actions">
    <button type="button" class="city-game-map-selection-bar-action" data-show-on-sketch>Show on sketch</button>
    <button type="button" class="city-game-map-selection-bar-action" data-copy-board-link>Copy link</button>
  </div>
</div>`;
}

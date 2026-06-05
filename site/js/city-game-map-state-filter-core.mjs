/**
 * City board — world-state category filters (no personal progress).
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

/** @typedef {"needs_action" | "unlocked" | "locked" | "changed_recently" | "care_paused" | "compromised" | "sanctuary_open"} BoardStateId */

export const STATE_FILTER_CHIPS = [
  { id: "all", label: "All states" },
  { id: "needs_action", label: "Needs action" },
  { id: "unlocked", label: "Unlocked" },
  { id: "locked", label: "Locked" },
  { id: "changed_recently", label: "Changed recently" },
  { id: "care_paused", label: "Care paused" },
  { id: "compromised", label: "Compromised" },
  { id: "sanctuary_open", label: "Sanctuaries" },
];

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
 * @returns {string}
 */
export function buildStateFilterHtml() {
  const chips = STATE_FILTER_CHIPS.map((chip, index) => {
    const pressed = chip.id === "all" ? "true" : "false";
    return `<button type="button" class="city-game-map-filter-btn" data-state-filter="${escapeAttr(chip.id)}" data-filter-label="${escapeAttr(chip.label)}" aria-pressed="${pressed}">${escapeAttr(chip.label)}</button>`;
  }).join("");
  return `<div class="city-game-map-state-filter city-game-map-filter" role="toolbar" aria-label="Filter by world state">
  <span class="city-game-map-filter-label">State</span>
  <div class="city-game-map-filter-chips city-game-map-filter-chips--wrap">${chips}</div>
</div>`;
}

/**
 * @param {{ lifecycle?: string; map_mode?: string; route_open?: boolean; role?: string; chips?: Array<{ kind?: string; value?: string }>; recently_changed?: boolean; compromised?: boolean } | null | undefined} snap
 * @param {string | null | undefined} role
 */
export function deriveNodeBoardStates(snap, role) {
  /** @type {Set<BoardStateId>} */
  const states = new Set();
  const roleId = String(role ?? "").trim();

  if (!snap) {
    if (roleId === "relay_gate" || roleId === "temp_drop") states.add("needs_action");
    if (roleId === "finale" || roleId === "lore_archive") states.add("locked");
    if (roleId === "sanctuary") states.add("sanctuary_open");
    return [...states];
  }

  const lifecycle = String(snap.lifecycle ?? "").trim();
  const mapMode = String(snap.map_mode ?? "").trim();
  const chips = Array.isArray(snap.chips) ? snap.chips : [];
  const chipText = chips.map((c) => String(c?.value ?? "")).join(" ").toLowerCase();

  if (lifecycle === "revoked" || snap.compromised || /compromised/i.test(chipText)) {
    states.add("compromised");
  }
  if (mapMode === "care_pause" || lifecycle === "paused") {
    states.add("care_paused");
  }
  if (snap.recently_changed) {
    states.add("changed_recently");
  }
  if (snap.route_open || /open ·|unlocked|live/i.test(chipText)) {
    states.add("unlocked");
  }
  if (/locked|sealed|dormant|unclaimed|awaiting|closed/i.test(chipText) || mapMode === "dormant") {
    states.add("locked");
  }
  if (
    mapMode === "quorum" ||
    mapMode === "fragment" ||
    mapMode === "scarcity" ||
    /quorum|collective|needs|unclaimed/i.test(chipText)
  ) {
    states.add("needs_action");
  }
  if (roleId === "sanctuary" && !states.has("care_paused")) {
    states.add("sanctuary_open");
  }

  if (!states.size) {
    if (roleId === "relay_gate" || roleId === "temp_drop") states.add("needs_action");
    else states.add("locked");
  }

  return [...states];
}

/**
 * @param {string | null | undefined} nodeStates
 * @param {string | null | undefined} activeState
 */
export function matchesStateFilter(nodeStates, activeState) {
  if (!activeState || activeState === "all") return true;
  const tokens = String(nodeStates ?? "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.includes(activeState);
}

/**
 * @param {{ boardStates?: string | null; boardVisibility?: string | null; role?: string | null }} node
 * @param {{ activeType?: string | null; activeState?: string | null }} filters
 */
export function matchesBoardStateFilters(node, filters) {
  const activeState =
    filters.activeState && filters.activeState !== "all" ? filters.activeState : null;
  if (!activeState) return true;
  return matchesStateFilter(node.boardStates, activeState);
}

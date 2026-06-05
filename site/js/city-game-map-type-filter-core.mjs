/**
 * City board — place type / role filter chips.
 * @see docs/CITY_GAME_MAP_DASHBOARD.md
 */

/** Role groups for type chips (All · Relays · Lore · … · Hidden). */
export const TYPE_FILTER_CHIPS = [
  { id: "all", label: "All", roles: null },
  { id: "relay_gate", label: "Relays", roles: ["relay_gate"] },
  { id: "lore", label: "Lore", roles: ["lore_archive", "temp_drop", "mobile_lore", "route_splitter"] },
  { id: "witness", label: "Witnesses", roles: ["witness"] },
  { id: "sanctuary", label: "Sanctuaries", roles: ["sanctuary"] },
  { id: "care_loop", label: "Care loops", roles: ["care_loop"] },
  { id: "finale", label: "Finale", roles: ["finale"] },
  { id: "hidden", label: "Hidden", roles: null, special: "hidden" },
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
 */
export function countHiddenTypeNodes(season) {
  const rows = Array.isArray(season?.nodes) ? season.nodes : [];
  const signalWar =
    season?.signal_war && typeof season.signal_war === "object"
      ? /** @type {{ map_visibility?: string; rumored_node_ids?: string[] }} */ (season.signal_war)
      : null;
  const mode = signalWar?.map_visibility?.trim() ?? "public";
  if (mode === "public") return 0;
  const rumored = new Set(
    (Array.isArray(signalWar?.rumored_node_ids) ? signalWar.rumored_node_ids : [])
      .map((id) => String(id ?? "").trim())
      .filter(Boolean)
  );
  let hidden = 0;
  for (const row of rows) {
    const role = String(row?.role ?? "").trim();
    const nodeId = String(row?.node_id ?? "").trim();
    if (role === "relay_gate" && mode === "signal_war" && !rumored.has(nodeId)) {
      hidden += 1;
    }
  }
  return hidden;
}

/**
 * @param {Record<string, unknown>} season
 */
export function buildTypeFilterOptions(season) {
  const roleCounts = countNodesByRole(season);
  const hiddenCount = countHiddenTypeNodes(season);

  return TYPE_FILTER_CHIPS.map((chip) => {
    if (chip.special === "hidden") {
      return { id: chip.id, label: chip.label, count: hiddenCount };
    }
    if (chip.id === "all") {
      const total = [...roleCounts.values()].reduce((sum, n) => sum + n, 0);
      return { id: chip.id, label: chip.label, count: total };
    }
    const roles = chip.roles ?? [];
    const count = roles.reduce((sum, role) => sum + (roleCounts.get(role) ?? 0), 0);
    return { id: chip.id, label: chip.label, count };
  }).filter((chip) => chip.id === "all" || chip.id === "hidden" || chip.count > 0);
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
export function buildTypeFilterHtml(season) {
  const options = buildTypeFilterOptions(season);
  const chips = options
    .map((chip) => {
      const pressed = chip.id === "all" ? "true" : "false";
      const countMarkup =
        chip.id === "all"
          ? ""
          : ` <span class="city-game-map-filter-btn-count">${chip.count}</span>`;
      return `<button type="button" class="city-game-map-filter-btn" data-type-filter="${escapeAttr(chip.id)}" data-filter-label="${escapeAttr(chip.label)}" aria-pressed="${pressed}">${escapeAttr(chip.label)}${countMarkup}</button>`;
    })
    .join("");
  return `<div class="city-game-map-type-filter city-game-map-filter" role="toolbar" aria-label="Filter places by type">
  <span class="city-game-map-filter-label">Type</span>
  <div class="city-game-map-filter-chips city-game-map-filter-chips--wrap">${chips}</div>
</div>`;
}

/**
 * @param {string | null | undefined} roleId
 * @param {string | null | undefined} activeType
 */
export function matchesTypeFilter(roleId, boardVisibility, activeType) {
  if (!activeType || activeType === "all") return true;
  if (activeType === "hidden") {
    return String(boardVisibility ?? "") === "hidden";
  }
  const chip = TYPE_FILTER_CHIPS.find((row) => row.id === activeType);
  if (!chip?.roles) return true;
  return chip.roles.includes(String(roleId ?? ""));
}

/**
 * @param {{ role?: string | null; boardVisibility?: string | null }} node
 * @param {{ activeType?: string | null }} filters
 */
export function matchesBoardTypeFilters(node, filters) {
  const activeType = filters.activeType && filters.activeType !== "all" ? filters.activeType : null;
  if (!activeType) return true;
  return matchesTypeFilter(node.role, node.boardVisibility, activeType);
}

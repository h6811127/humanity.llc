/**
 * @deprecated Prefer city-game-map-type-filter-core.mjs — kept for test imports.
 */
export {
  buildTypeFilterHtml as buildExploreFilterHtml,
  buildTypeFilterOptions as buildExploreFilterOptions,
  countNodesByRole,
  matchesBoardTypeFilters as matchesBoardNodeFilters,
  matchesTypeFilter as matchesExploreFilter,
} from "./city-game-map-type-filter-core.mjs";

export { matchesDistrictFilter } from "./city-game-map-filter-core.mjs";

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

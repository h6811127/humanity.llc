/**
 * City board filter summary — E0.5 viewing line + visible place count.
 */

/**
 * @param {string | null | undefined} activeType
 * @param {string | null | undefined} activeState
 */
export function isBoardFilterActive(activeType, activeState) {
  const type = String(activeType ?? "all");
  const state = String(activeState ?? "all");
  return type !== "all" || state !== "all";
}

/**
 * @param {string} typeLabel
 * @param {string | null | undefined} stateLabel
 */
export function formatBoardFilterSummaryScope(typeLabel, stateLabel) {
  const state = stateLabel?.trim();
  return state ? `${typeLabel} · ${state}` : typeLabel;
}

/**
 * @param {number} count
 */
export function formatBoardFilterCountLabel(count) {
  const safe = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  if (safe === 0) return "0 places — try another district or kind";
  return safe === 1 ? "1 place" : `${safe} places`;
}

/**
 * @param {Record<string, unknown>} season
 * @returns {string}
 */
export function buildBoardFilterSummaryHtml() {
  return `<div class="city-game-map-filter-summary" id="city-game-map-filter-summary" hidden aria-live="polite">
  <div class="city-game-map-filter-summary-main">
    <p class="city-game-map-filter-summary-line">
      <span class="city-game-map-filter-summary-kicker">Viewing:</span>
      <span class="city-game-map-filter-summary-scope" data-filter-summary-scope></span>
    </p>
    <p class="city-game-map-filter-summary-count" data-filter-summary-count></p>
  </div>
  <button type="button" class="city-game-map-filter-clear" data-filter-clear>Clear filters</button>
</div>`;
}

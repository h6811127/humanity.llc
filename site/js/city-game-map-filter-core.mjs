/**
 * City board filter visibility — district + Explore By (AND).
 */

import { matchesBoardNodeFilters, normalizeBoardFilterState } from "./city-game-map-explore-core.mjs";
import {
  formatBoardFilterCountLabel,
  formatBoardFilterSummaryScope,
  isBoardFilterActive,
} from "./city-game-map-filter-summary-core.mjs";

/**
 * @param {HTMLElement} boardRoot
 */
export function countVisibleBoardNodes(boardRoot) {
  let count = 0;
  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    if (!row || typeof row !== "object" || !("hidden" in row)) continue;
    if (!row.hidden) count += 1;
  }
  return count;
}

/**
 * @param {string} value
 */
function escapeSelectorValue(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} filterAttr
 * @param {string} filterId
 * @param {string} fallbackLabel
 */
function readFilterButtonLabel(boardRoot, filterAttr, filterId, fallbackLabel) {
  const selector = `[${filterAttr}="${escapeSelectorValue(filterId)}"]`;
  const btn = boardRoot.querySelector(selector);
  if (!btn || typeof btn.getAttribute !== "function") return fallbackLabel;
  const dataLabel = btn.getAttribute("data-filter-label");
  if (dataLabel && dataLabel.trim()) return dataLabel.trim();
  const text = typeof btn.textContent === "string" ? btn.textContent.trim() : "";
  return text || fallbackLabel;
}

/**
 * @param {HTMLElement} boardRoot
 */
export function syncBoardFilterSummary(boardRoot) {
  const summary = boardRoot.querySelector("#city-game-map-filter-summary");
  if (!summary || typeof summary !== "object" || !("hidden" in summary)) return;

  const districtId = boardRoot.dataset.activeDistrict ?? "all";
  const exploreId = boardRoot.dataset.activeExplore ?? "all";

  if (!isBoardFilterActive(districtId, exploreId)) {
    summary.hidden = true;
    return;
  }

  const districtLabel = readFilterButtonLabel(
    boardRoot,
    "data-district-filter",
    districtId,
    districtId === "all" ? "All districts" : districtId
  );
  const exploreLabel = readFilterButtonLabel(
    boardRoot,
    "data-explore-filter",
    exploreId,
    exploreId === "all" ? "All kinds" : exploreId
  );

  const scopeEl = summary.querySelector("[data-filter-summary-scope]");
  if (scopeEl) {
    scopeEl.textContent = formatBoardFilterSummaryScope(districtLabel, exploreLabel);
  }

  const countEl = summary.querySelector("[data-filter-summary-count]");
  if (countEl) {
    countEl.textContent = formatBoardFilterCountLabel(countVisibleBoardNodes(boardRoot));
  }

  summary.hidden = false;
}

/**
 * @param {{ hidden?: boolean; hasAttribute?: (name: string) => boolean } | null | undefined} el
 * @param {boolean} hidden
 */
export function setBoardFilterHidden(el, hidden) {
  if (!el || typeof el !== "object") return;
  if (typeof el.setAttribute === "function" && typeof el.removeAttribute === "function") {
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }
  if ("hidden" in el) el.hidden = hidden;
}

/**
 * @param {HTMLElement} boardRoot
 */
export function applyBoardFilterVisibility(boardRoot) {
  const { activeDistrict, activeExplore } = normalizeBoardFilterState(
    boardRoot.dataset.activeDistrict,
    boardRoot.dataset.activeExplore
  );

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    if (!row || typeof row !== "object" || typeof row.getAttribute !== "function") continue;
    const match = matchesBoardNodeFilters(
      {
        district: row.getAttribute("data-district"),
        role: row.getAttribute("data-role"),
      },
      { activeDistrict, activeExplore }
    );
    if ("hidden" in row) row.hidden = !match;
    else setBoardFilterHidden(row, !match);
  }

  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-district]")) {
    if (!pin || typeof pin !== "object" || typeof pin.getAttribute !== "function") continue;
    const match = matchesBoardNodeFilters(
      {
        district: pin.getAttribute("data-district"),
        role: pin.getAttribute("data-role"),
      },
      { activeDistrict, activeExplore }
    );
    setBoardFilterHidden(pin, !match);
  }

  for (const block of boardRoot.querySelectorAll(".city-game-map-district[data-district]")) {
    if (!block || typeof block !== "object" || typeof block.getAttribute !== "function") continue;
    const districtId = block.getAttribute("data-district");
    if (activeDistrict && districtId !== activeDistrict) {
      setBoardFilterHidden(block, true);
      continue;
    }
    const rowNodes =
      typeof block.querySelectorAll === "function"
        ? block.querySelectorAll(".city-game-map-node-row")
        : [];
    const anyVisible = [...rowNodes].some((row) => {
      if (!row || typeof row !== "object") return false;
      if ("hidden" in row) return !row.hidden;
      return !row.hasAttribute?.("hidden");
    });
    setBoardFilterHidden(block, !anyVisible);
  }

  syncBoardFilterSummary(boardRoot);
}

/**
 * Only narrowed (non-all) chips get filled active styling — "All" stays neutral
 * so selecting Relay/NewBo reads as a new highlight, not a same-weight swap.
 * @param {string} filterId
 */
export function isBoardFilterChipEmphasized(filterId) {
  return String(filterId ?? "all") !== "all";
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} districtId
 */
export function syncDistrictFilterUi(boardRoot, districtId) {
  const toolbar =
    boardRoot.querySelector(".city-game-map-district-filter") ??
    boardRoot.querySelector(".city-game-map-filter");
  if (!toolbar) return;
  const emphasize = isBoardFilterChipEmphasized(districtId);
  for (const btn of toolbar.querySelectorAll("[data-district-filter]")) {
    if (!btn || typeof btn !== "object" || !("dataset" in btn)) continue;
    const selected = btn.dataset.districtFilter === districtId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", selected && emphasize);
    }
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} exploreId
 */
export function syncExploreFilterUi(boardRoot, exploreId) {
  const toolbar = boardRoot.querySelector(".city-game-map-explore-filter");
  if (!toolbar) return;
  const emphasize = isBoardFilterChipEmphasized(exploreId);
  for (const btn of toolbar.querySelectorAll("[data-explore-filter]")) {
    if (!btn || typeof btn !== "object" || !("dataset" in btn)) continue;
    const selected = btn.dataset.exploreFilter === exploreId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", selected && emphasize);
    }
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} districtId
 */
export function setDistrictFilter(boardRoot, districtId) {
  boardRoot.dataset.activeDistrict = districtId;
  applyBoardFilterVisibility(boardRoot);
  syncDistrictFilterUi(boardRoot, districtId);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} exploreId
 */
export function setExploreFilter(boardRoot, exploreId) {
  boardRoot.dataset.activeExplore = exploreId;
  applyBoardFilterVisibility(boardRoot);
  syncExploreFilterUi(boardRoot, exploreId);
}

/**
 * @param {HTMLElement} boardRoot
 */
export function clearBoardFilters(boardRoot) {
  boardRoot.dataset.activeDistrict = "all";
  boardRoot.dataset.activeExplore = "all";
  applyBoardFilterVisibility(boardRoot);
  syncDistrictFilterUi(boardRoot, "all");
  syncExploreFilterUi(boardRoot, "all");
}

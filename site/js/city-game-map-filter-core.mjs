/**
 * City board filter visibility — type + world-state (AND).
 */

import { matchesBoardStateFilters } from "./city-game-map-state-filter-core.mjs";
import { matchesBoardTypeFilters } from "./city-game-map-type-filter-core.mjs";
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

  const typeId = boardRoot.dataset.activeType ?? boardRoot.dataset.activeExplore ?? "all";
  const stateId = boardRoot.dataset.activeState ?? "all";

  if (!isBoardFilterActive(typeId, stateId)) {
    summary.hidden = true;
    return;
  }

  const typeLabel = readFilterButtonLabel(
    boardRoot,
    "data-type-filter",
    typeId,
    typeId === "all" ? "All" : typeId
  );
  const stateLabel =
    stateId === "all"
      ? null
      : readFilterButtonLabel(boardRoot, "data-state-filter", stateId, stateId);

  const scopeEl = summary.querySelector("[data-filter-summary-scope]");
  const countEl = summary.querySelector("[data-filter-summary-count]");
  const count = countVisibleBoardNodes(boardRoot);
  const countLabel = formatBoardFilterCountLabel(count);
  const scopeParts = [];
  if (typeId !== "all") scopeParts.push(typeLabel);
  if (stateId !== "all" && stateLabel) scopeParts.push(stateLabel);
  scopeParts.push(countLabel);

  if (scopeEl) {
    scopeEl.textContent = scopeParts.join(" · ");
  }
  if (countEl) {
    countEl.textContent = "";
    countEl.hidden = true;
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
  const activeType =
    boardRoot.dataset.activeType && boardRoot.dataset.activeType !== "all"
      ? boardRoot.dataset.activeType
      : boardRoot.dataset.activeExplore && boardRoot.dataset.activeExplore !== "all"
        ? boardRoot.dataset.activeExplore
        : null;
  const activeState =
    boardRoot.dataset.activeState && boardRoot.dataset.activeState !== "all"
      ? boardRoot.dataset.activeState
      : null;

  for (const row of boardRoot.querySelectorAll(".city-game-map-node-row[data-node-id]")) {
    if (!row || typeof row !== "object" || typeof row.getAttribute !== "function") continue;
    const typeMatch = matchesBoardTypeFilters(
      {
        role: row.getAttribute("data-role"),
        boardVisibility: row.getAttribute("data-board-visibility"),
      },
      { activeType }
    );
    const stateMatch = matchesBoardStateFilters(
      {
        boardStates: row.getAttribute("data-board-states"),
      },
      { activeState }
    );
    const match = typeMatch && stateMatch;
    if ("hidden" in row) row.hidden = !match;
    else setBoardFilterHidden(row, !match);
  }

  for (const pin of boardRoot.querySelectorAll(".city-game-map-pin[data-node-id]")) {
    if (!pin || typeof pin !== "object" || typeof pin.getAttribute !== "function") continue;
    const typeMatch = matchesBoardTypeFilters(
      {
        role: pin.getAttribute("data-role"),
        boardVisibility: pin.getAttribute("data-board-visibility"),
      },
      { activeType }
    );
    const stateMatch = matchesBoardStateFilters(
      {
        boardStates: pin.getAttribute("data-board-states"),
      },
      { activeState }
    );
    setBoardFilterHidden(pin, !(typeMatch && stateMatch));
  }

  for (const block of boardRoot.querySelectorAll(".city-game-map-district[data-district]")) {
    if (!block || typeof block !== "object" || typeof block.getAttribute !== "function") continue;
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
 * @param {string} filterId
 */
export function isBoardFilterChipEmphasized(filterId) {
  return String(filterId ?? "all") !== "all";
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} typeId
 */
export function syncTypeFilterUi(boardRoot, typeId) {
  const toolbar = boardRoot.querySelector(".city-game-map-type-filter");
  if (!toolbar) return;
  const emphasize = isBoardFilterChipEmphasized(typeId);
  for (const btn of toolbar.querySelectorAll("[data-type-filter]")) {
    if (!btn || typeof btn !== "object") continue;
    const selected = btn.getAttribute("data-type-filter") === typeId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", selected && emphasize);
    }
  }
}

/** @deprecated Use syncTypeFilterUi */
export function syncExploreFilterUi(boardRoot, exploreId) {
  syncTypeFilterUi(boardRoot, exploreId);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} stateId
 */
export function syncStateFilterUi(boardRoot, stateId) {
  const toolbar = boardRoot.querySelector(".city-game-map-state-filter");
  if (!toolbar) return;
  const emphasize = isBoardFilterChipEmphasized(stateId);
  for (const btn of toolbar.querySelectorAll("[data-state-filter]")) {
    if (!btn || typeof btn !== "object") continue;
    const selected = btn.getAttribute("data-state-filter") === stateId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", selected && emphasize);
    }
  }
}

/** @deprecated District filter removed from primary board UI. */
export function syncDistrictFilterUi(_boardRoot, _districtId) {}

/** @deprecated District filter removed from primary board UI. */
export function setDistrictFilter(boardRoot, districtId) {
  boardRoot.dataset.activeDistrict = districtId;
  applyBoardFilterVisibility(boardRoot);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} typeId
 */
export function setTypeFilter(boardRoot, typeId) {
  boardRoot.dataset.activeType = typeId;
  boardRoot.dataset.activeExplore = typeId;
  applyBoardFilterVisibility(boardRoot);
  syncTypeFilterUi(boardRoot, typeId);
}

/** @deprecated Use setTypeFilter */
export function setExploreFilter(boardRoot, exploreId) {
  setTypeFilter(boardRoot, exploreId);
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} stateId
 */
export function setStateFilter(boardRoot, stateId) {
  boardRoot.dataset.activeState = stateId;
  applyBoardFilterVisibility(boardRoot);
  syncStateFilterUi(boardRoot, stateId);
}

/**
 * @param {HTMLElement} boardRoot
 */
export function clearBoardFilters(boardRoot) {
  boardRoot.dataset.activeType = "all";
  boardRoot.dataset.activeExplore = "all";
  boardRoot.dataset.activeState = "all";
  boardRoot.dataset.activeDistrict = "all";
  applyBoardFilterVisibility(boardRoot);
  syncTypeFilterUi(boardRoot, "all");
  syncStateFilterUi(boardRoot, "all");
}

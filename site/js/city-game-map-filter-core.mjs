/**
 * City board filter visibility — district + Explore By (AND).
 */

import { matchesBoardNodeFilters, normalizeBoardFilterState } from "./city-game-map-explore-core.mjs";

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
    if ("hidden" in pin) pin.hidden = !match;
  }

  for (const block of boardRoot.querySelectorAll(".city-game-map-district[data-district]")) {
    if (!block || typeof block !== "object" || typeof block.getAttribute !== "function") continue;
    const districtId = block.getAttribute("data-district");
    if (activeDistrict && districtId !== activeDistrict) {
      if ("hidden" in block) block.hidden = true;
      continue;
    }
    const rowNodes =
      typeof block.querySelectorAll === "function"
        ? block.querySelectorAll(".city-game-map-node-row")
        : [];
    const anyVisible = [...rowNodes].some(
      (row) => row && typeof row === "object" && "hidden" in row && !row.hidden
    );
    if ("hidden" in block) block.hidden = !anyVisible;
  }
}

/**
 * @param {HTMLElement} boardRoot
 * @param {string} districtId
 */
export function syncDistrictFilterUi(boardRoot, districtId) {
  const toolbar = boardRoot.querySelector(".city-game-map-filter");
  if (!toolbar) return;
  for (const btn of toolbar.querySelectorAll("[data-district-filter]")) {
    if (!btn || typeof btn !== "object" || !("dataset" in btn)) continue;
    const active = btn.dataset.districtFilter === districtId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", active);
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
  for (const btn of toolbar.querySelectorAll("[data-explore-filter]")) {
    if (!btn || typeof btn !== "object" || !("dataset" in btn)) continue;
    const active = btn.dataset.exploreFilter === exploreId;
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
    if (btn.classList && typeof btn.classList.toggle === "function") {
      btn.classList.toggle("city-game-map-filter-btn--active", active);
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

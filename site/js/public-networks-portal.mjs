/**
 * Find public networks — `/` and `/play/season/`
 */
import { CITY_GAME_SEASONS_INDEX_URL } from "./city-game-season-resolve.mjs";
import {
  buildPublicNetworkCardModel,
  filterPublicNetworkCards,
  listedPublicNetworkRows,
  publicNetworkVisionCardModels,
  publicNetworksEmptyMessage,
  renderPublicNetworkCategoryChips,
  renderPublicNetworkResults,
} from "./public-networks-portal-core.mjs";

/** @typedef {import("./public-networks-portal-core.mjs").PublicNetworkCategoryFilter} PublicNetworkCategoryFilter */

async function fetchSeasonConfig(jsonUrl) {
  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`season fetch ${res.status}`);
  return res.json();
}

/**
 * @param {Record<string, unknown>[]} rows
 */
async function loadPublicNetworkCards(rows) {
  const listed = listedPublicNetworkRows(rows);
  return Promise.all(
    listed.map(async (row) => {
      const jsonUrl = row.json_url?.trim();
      if (!jsonUrl) {
        return buildPublicNetworkCardModel(row, null);
      }
      try {
        const season = await fetchSeasonConfig(jsonUrl);
        return buildPublicNetworkCardModel(row, season);
      } catch (err) {
        console.warn("[public-networks-portal]", jsonUrl, err);
        return buildPublicNetworkCardModel(row, null);
      }
    })
  );
}

function bindPublicNetworksPortal(allCards) {
  const searchInput = document.getElementById("public-networks-search");
  const chipsRoot = document.getElementById("public-networks-categories");
  const resultsRoot = document.getElementById("public-networks-results");
  const emptyEl = document.getElementById("public-networks-empty");
  if (!searchInput || !chipsRoot || !resultsRoot || !emptyEl) return;

  /** @type {PublicNetworkCategoryFilter} */
  let activeCategory = "all";

  const render = () => {
    const query = searchInput.value;
    const filtered = filterPublicNetworkCards(allCards, { query, category: activeCategory });
    chipsRoot.innerHTML = renderPublicNetworkCategoryChips(activeCategory, allCards);
    resultsRoot.innerHTML = renderPublicNetworkResults(filtered);
    const showEmpty = filtered.length === 0;
    emptyEl.hidden = !showEmpty;
    emptyEl.textContent = publicNetworksEmptyMessage({
      hasListed: allCards.length > 0,
      category: activeCategory,
      query,
    });
  };

  searchInput.addEventListener("input", render);
  chipsRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-public-network-category]");
    if (!(button instanceof HTMLButtonElement)) return;
    const next = button.getAttribute("data-public-network-category");
    if (!next) return;
    activeCategory = /** @type {PublicNetworkCategoryFilter} */ (next);
    render();
  });

  render();
}

async function bootPublicNetworksPortal() {
  const resultsRoot = document.getElementById("public-networks-results");
  if (!resultsRoot) return;

  try {
    const res = await fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json();
    const rows = Array.isArray(body.seasons) ? body.seasons : [];
    const liveCards = await loadPublicNetworkCards(rows);
    const cards = [...liveCards, ...publicNetworkVisionCardModels()];
    bindPublicNetworksPortal(cards);
  } catch (err) {
    console.warn("[public-networks-portal]", err);
    const emptyEl = document.getElementById("public-networks-empty");
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent = "Could not load public networks.";
    }
    resultsRoot.innerHTML = "";
  }
}

bootPublicNetworksPortal();

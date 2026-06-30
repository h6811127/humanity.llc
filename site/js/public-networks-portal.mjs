/**
 * Find public networks — `/` and `/play/season/`
 */
import { CITY_GAME_SEASONS_INDEX_URL } from "./city-game-season-resolve.mjs";
import {
  buildLandingCategoryUrl,
  landingShelfIdForCategory,
  readLandingCategoryQueryParam,
  resolveLandingShelfCategory,
  syncLiveNowShelfCopy,
} from "./landing-entry-shelves-core.mjs";
import { hydrateLandingLiveObjectCarriers } from "./landing-live-object-carriers.mjs";
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

/**
 * @param {PublicNetworkCategoryFilter} category
 */
function syncLandingCategoryUrl(category) {
  if (typeof window === "undefined" || typeof history?.replaceState !== "function") return;
  const nextUrl = buildLandingCategoryUrl(category, window.location.pathname);
  if (`${window.location.pathname}${window.location.search}` === nextUrl) return;
  history.replaceState(null, "", nextUrl);
}

/**
 * @param {PublicNetworkCategoryFilter} category
 */
function syncLandingShelfActiveState(category) {
  const activeShelfId = landingShelfIdForCategory(category);
  for (const btn of document.querySelectorAll("[data-landing-shelf]")) {
    if (!(btn instanceof HTMLElement)) continue;
    const shelfId = btn.getAttribute("data-landing-shelf");
    const active = Boolean(activeShelfId && shelfId === activeShelfId);
    btn.classList.toggle("landing-entry-shelf-btn--active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function bindPublicNetworksPortal(allCards) {
  const searchInput = document.getElementById("public-networks-search");
  const chipsRoot = document.getElementById("public-networks-categories");
  const resultsRoot = document.getElementById("public-networks-results");
  const emptyEl = document.getElementById("public-networks-empty");
  const shelvesRoot = document.getElementById("landing-entry-shelves");
  if (!searchInput || !chipsRoot || !resultsRoot || !emptyEl) return;

  /** @type {PublicNetworkCategoryFilter} */
  let activeCategory = readLandingCategoryQueryParam(window.location.search);

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
    syncLandingShelfActiveState(activeCategory);
    syncLandingCategoryUrl(activeCategory);
  };

  const setCategory = (category) => {
    activeCategory = category;
    render();
    const toolbar = document.querySelector(".public-networks-toolbar");
    if (toolbar instanceof HTMLElement) {
      toolbar.scrollIntoView({ block: "start", behavior: "smooth" });
    }
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

  if (shelvesRoot instanceof HTMLElement) {
    shelvesRoot.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-landing-shelf]");
      if (!(button instanceof HTMLButtonElement)) return;
      const shelfId = button.getAttribute("data-landing-shelf");
      if (!shelfId) return;
      setCategory(resolveLandingShelfCategory(shelfId));
    });
  }

  render();
}

async function bootPublicNetworksPortal() {
  void hydrateLandingLiveObjectCarriers(document);

  const resultsRoot = document.getElementById("public-networks-results");
  if (!resultsRoot) return;

  try {
    const res = await fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json();
    const rows = Array.isArray(body.seasons) ? body.seasons : [];
    const liveCards = await loadPublicNetworkCards(rows);
    const cards = [...liveCards, ...publicNetworkVisionCardModels()];
    const featuredLive = liveCards.find(
      (card) => card.isLive && card.category === "city_games" && card.placeCount
    );
    if (featuredLive) {
      syncLiveNowShelfCopy(document, {
        seasonName: featuredLive.name,
        placeCount: featuredLive.placeCount,
        city: featuredLive.place?.split(",")[0]?.trim() || "Cedar Rapids",
      });
    }
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

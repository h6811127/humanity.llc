/**
 * Find public networks — `/` and `/play/season/`
 * On `/` (WS-DISCOVER-P5a/b): also hydrates places strip from DiscoveryPin index.
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
  bindLandingPlacesNearMe,
  fetchLandingPinIndex,
  fetchLandingPlacesSnapshotIndex,
  LANDING_DEFAULT_DISCOVERY_REGION,
  paintLandingPlacesSection,
  resolveLandingCategoryPinFacet,
  resolveLandingShelfPinFacet,
} from "./landing-places.mjs";
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
/** @typedef {import("./landing-places-core.mjs").LandingPinFacet} LandingPinFacet */
/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */

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

/**
 * @param {LandingPinFacet} facet
 * @param {string | null} activeShelfId
 */
function syncLandingShelfActiveStateForFacet(facet, activeShelfId) {
  if (activeShelfId) {
    for (const btn of document.querySelectorAll("[data-landing-shelf]")) {
      if (!(btn instanceof HTMLElement)) continue;
      const shelfId = btn.getAttribute("data-landing-shelf");
      const active = shelfId === activeShelfId;
      btn.classList.toggle("landing-entry-shelf-btn--active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
    return;
  }
  syncLandingShelfActiveState(
    facet === "live_now" ? "city_games" : facet === "open_paused" ? "resources" : "all"
  );
}

/**
 * @param {import("./public-networks-portal-core.mjs").PublicNetworkCardModel[]} allCards
 * @param {{
 *   pins?: DiscoveryPin[];
 *   region?: string;
 *   snapshotIndex?: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> | null;
 *   cityLabel?: string;
 * } | null} placesCtx
 */
function bindPublicNetworksPortal(allCards, placesCtx = null) {
  const searchInput = document.getElementById("public-networks-search");
  const chipsRoot = document.getElementById("public-networks-categories");
  const resultsRoot = document.getElementById("public-networks-results");
  const emptyEl = document.getElementById("public-networks-empty");
  const shelvesRoot = document.getElementById("landing-entry-shelves");
  const placesRoot = document.getElementById("landing-places-results");
  if (!searchInput || !chipsRoot || !resultsRoot || !emptyEl) return;

  /** @type {PublicNetworkCategoryFilter} */
  let activeCategory = readLandingCategoryQueryParam(window.location.search);
  /** @type {LandingPinFacet} */
  let activePinFacet = resolveLandingCategoryPinFacet(activeCategory);
  /** @type {string | null} */
  let activeShelfId = landingShelfIdForCategory(activeCategory);

  const hasPlaces = Boolean(placesRoot && placesCtx?.pins);
  /** @type {import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null} */
  let clientCoords = null;

  const renderPlaces = () => {
    if (!hasPlaces || !placesCtx) return;
    paintLandingPlacesSection({
      pins: placesCtx.pins ?? [],
      region: placesCtx.region ?? LANDING_DEFAULT_DISCOVERY_REGION,
      query: searchInput instanceof HTMLInputElement ? searchInput.value : "",
      facet: activePinFacet,
      snapshotIndex: placesCtx.snapshotIndex ?? null,
      cityLabel: placesCtx.cityLabel,
      clientCoords,
    });
  };

  const render = () => {
    const query = searchInput instanceof HTMLInputElement ? searchInput.value : "";
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
    if (activeShelfId) {
      syncLandingShelfActiveStateForFacet(activePinFacet, activeShelfId);
    } else {
      syncLandingShelfActiveState(activeCategory);
    }
    syncLandingCategoryUrl(activeCategory);
    renderPlaces();
  };

  const setCategory = (category, facet, shelfId) => {
    activeCategory = category;
    activePinFacet = facet ?? resolveLandingCategoryPinFacet(category);
    activeShelfId = shelfId ?? landingShelfIdForCategory(category);
    render();
    const scrollTarget =
      document.getElementById("landing-places") ??
      document.querySelector(".public-networks-toolbar");
    if (scrollTarget instanceof HTMLElement) {
      scrollTarget.scrollIntoView({ block: "start", behavior: "smooth" });
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
    setCategory(
      /** @type {PublicNetworkCategoryFilter} */ (next),
      resolveLandingCategoryPinFacet(next),
      landingShelfIdForCategory(/** @type {PublicNetworkCategoryFilter} */ (next))
    );
  });

  if (shelvesRoot instanceof HTMLElement) {
    shelvesRoot.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-landing-shelf]");
      if (!(button instanceof HTMLButtonElement)) return;
      const shelfId = button.getAttribute("data-landing-shelf");
      if (!shelfId) return;
      setCategory(
        resolveLandingShelfCategory(shelfId),
        resolveLandingShelfPinFacet(shelfId),
        shelfId
      );
    });
  }

  if (hasPlaces) {
    bindLandingPlacesNearMe({
      getClientCoords: () => clientCoords,
      setClientCoords: (coords) => {
        clientCoords = coords;
      },
      render: renderPlaces,
    });
  }

  render();
}

async function bootPublicNetworksPortal() {
  void hydrateLandingLiveObjectCarriers(document);

  const resultsRoot = document.getElementById("public-networks-results");
  if (!resultsRoot) return;

  /** @type {{ pins: DiscoveryPin[]; region: string; snapshotIndex: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> | null; cityLabel: string } | null} */
  let placesCtx = null;
  const placesMount = document.getElementById("landing-places-results");

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

    if (placesMount instanceof HTMLElement) {
      try {
        const region = LANDING_DEFAULT_DISCOVERY_REGION;
        const pinIndex = await fetchLandingPinIndex(region);
        const pins = Array.isArray(pinIndex?.pins)
          ? /** @type {DiscoveryPin[]} */ (pinIndex.pins)
          : [];
        const seasonId =
          featuredLive?.season_id ||
          String(rows.find((r) => r?.season_id)?.season_id ?? "cr_season_01_wake");
        const snapshotIndex = await fetchLandingPlacesSnapshotIndex(seasonId);
        placesCtx = {
          pins,
          region: String(pinIndex?.region ?? region),
          snapshotIndex,
          cityLabel: featuredLive?.place?.split(",")[0]?.trim() || "Cedar Rapids",
        };
        paintLandingPlacesSection({
          ...placesCtx,
          query: "",
          facet: resolveLandingCategoryPinFacet(
            readLandingCategoryQueryParam(window.location.search)
          ),
          clientCoords: null,
        });
      } catch (placesErr) {
        console.warn("[landing-places]", placesErr);
        placesMount.innerHTML =
          '<p class="landing-places-empty discovery-region-empty">Could not load places.</p>';
      }
    }

    bindPublicNetworksPortal(cards, placesCtx);
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

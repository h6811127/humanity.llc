/**
 * Find public networks — `/` and `/play/season/`
 * On `/` (WS-DISCOVER-P5a/b/c): hydrates places strip + multi-region picker.
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
  bindLandingPlacesRegionPicker,
  cityLabelForLandingPlacesRegion,
  fetchLandingPinIndex,
  fetchLandingPlacesRegionOptions,
  fetchLandingPlacesSnapshotIndex,
  LANDING_DEFAULT_DISCOVERY_REGION,
  paintLandingPlacesSection,
  resolveLandingCategoryPinFacet,
  resolveLandingPlacesRegionSelection,
  resolveLandingShelfPinFacet,
  seasonIdForLandingPlacesRegion,
  syncLandingRegionQueryParam,
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
/** @typedef {import("./landing-places-region-core.mjs").LandingPlacesRegionOption} LandingPlacesRegionOption */

/**
 * @typedef {{
 *   pins: DiscoveryPin[];
 *   region: string;
 *   snapshotIndex: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> | null;
 *   cityLabel: string;
 *   regionOptions: LandingPlacesRegionOption[];
 * }} LandingPlacesCtx
 */

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
 * @param {LandingPlacesRegionOption[]} regionOptions
 * @param {string} regionSlug
 * @param {string | null | undefined} [fallbackSeasonId]
 * @returns {Promise<LandingPlacesCtx>}
 */
async function loadLandingPlacesCtx(regionOptions, regionSlug, fallbackSeasonId) {
  const region = regionSlug || LANDING_DEFAULT_DISCOVERY_REGION;
  const pinIndex = await fetchLandingPinIndex(region);
  const pins = Array.isArray(pinIndex?.pins)
    ? /** @type {DiscoveryPin[]} */ (pinIndex.pins)
    : [];
  const knownSeason = seasonIdForLandingPlacesRegion(regionOptions, region, "");
  const seasonId =
    knownSeason ||
    (region === LANDING_DEFAULT_DISCOVERY_REGION
      ? String(fallbackSeasonId ?? "").trim()
      : "");
  const snapshotIndex = await fetchLandingPlacesSnapshotIndex(seasonId || null);
  return {
    pins,
    region: String(pinIndex?.region ?? region),
    snapshotIndex,
    cityLabel: cityLabelForLandingPlacesRegion(regionOptions, region),
    regionOptions,
  };
}

/**
 * @param {PublicNetworkCategoryFilter} category
 * @param {string} region
 */
function syncLandingPlacesUrl(category, region) {
  if (typeof window === "undefined" || typeof history?.replaceState !== "function") return;
  const regionSlug = String(region ?? "").trim();
  const nextUrl = buildLandingCategoryUrl(category, window.location.pathname, {
    search: window.location.search,
    region:
      regionSlug && regionSlug !== LANDING_DEFAULT_DISCOVERY_REGION ? regionSlug : null,
  });
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
 *   placesCtx: LandingPlacesCtx | null;
 *   onRegionChange?: (regionSlug: string) => void | Promise<void>;
 * }} [placesApi]
 */
function bindPublicNetworksPortal(allCards, placesApi = {}) {
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

  const hasPlaces = Boolean(placesRoot && placesApi.placesCtx);
  /** @type {import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null} */
  let clientCoords = null;
  let regionLoadGeneration = 0;

  const renderPlaces = () => {
    const activePlacesCtx = placesApi.placesCtx;
    if (!hasPlaces || !activePlacesCtx) return;
    paintLandingPlacesSection({
      pins: activePlacesCtx.pins ?? [],
      region: activePlacesCtx.region ?? LANDING_DEFAULT_DISCOVERY_REGION,
      query: searchInput instanceof HTMLInputElement ? searchInput.value : "",
      facet: activePinFacet,
      snapshotIndex: activePlacesCtx.snapshotIndex ?? null,
      cityLabel: activePlacesCtx.cityLabel,
      clientCoords,
      regionOptions: activePlacesCtx.regionOptions ?? [],
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
    if (hasPlaces && placesApi.placesCtx) {
      syncLandingPlacesUrl(activeCategory, placesApi.placesCtx.region);
    } else {
      const nextUrl = buildLandingCategoryUrl(activeCategory, window.location.pathname, {
        search: window.location.search,
      });
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        history.replaceState(null, "", nextUrl);
      }
    }
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
    bindLandingPlacesRegionPicker({
      onRegionChange: async (regionSlug) => {
        if (!placesApi.onRegionChange) return;
        const loadGen = ++regionLoadGeneration;
        clientCoords = null;
        const placesMount = document.getElementById("landing-places-results");
        if (placesMount instanceof HTMLElement) {
          placesMount.innerHTML = '<p class="landing-places-loading">Loading places…</p>';
        }
        try {
          await placesApi.onRegionChange(regionSlug);
          if (loadGen !== regionLoadGeneration) return;
          syncLandingRegionQueryParam(regionSlug);
          renderPlaces();
          if (placesApi.placesCtx) {
            syncLandingPlacesUrl(activeCategory, placesApi.placesCtx.region);
          }
        } catch (err) {
          if (loadGen !== regionLoadGeneration) return;
          console.warn("[landing-places-region]", err);
          if (placesMount instanceof HTMLElement) {
            placesMount.innerHTML =
              '<p class="landing-places-empty discovery-region-empty">Could not load places.</p>';
          }
        }
      },
    });
  }

  render();
}

async function bootPublicNetworksPortal() {
  void hydrateLandingLiveObjectCarriers(document);

  const resultsRoot = document.getElementById("public-networks-results");
  if (!resultsRoot) return;

  /** @type {LandingPlacesCtx | null} */
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

    /** @type {LandingPlacesRegionOption[]} */
    let regionOptions = [];
    let defaultRegion = LANDING_DEFAULT_DISCOVERY_REGION;
    try {
      const catalog = await fetchLandingPlacesRegionOptions();
      regionOptions = catalog.options;
      defaultRegion = catalog.defaultRegion;
    } catch (catalogErr) {
      console.warn("[landing-places] regions catalog", catalogErr);
      regionOptions = [
        {
          region_slug: LANDING_DEFAULT_DISCOVERY_REGION,
          label: "Cedar Rapids",
          city: "Cedar Rapids, Iowa",
          season_id: "cr_season_01_wake",
          browse_href: "/discover/cedar-rapids-iowa/",
        },
      ];
    }

    if (placesMount instanceof HTMLElement) {
      try {
        const storage =
          typeof localStorage !== "undefined" ? localStorage : null;
        const region = resolveLandingPlacesRegionSelection(
          regionOptions,
          window.location.search,
          storage,
          defaultRegion
        );
        placesCtx = await loadLandingPlacesCtx(
          regionOptions,
          region,
          featuredLive?.season_id ||
            String(rows.find((r) => r?.season_id)?.season_id ?? "cr_season_01_wake")
        );
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

    /** Mutable holder so region switches update the bound portal. */
    const placesApi = {
      placesCtx,
      /**
       * @param {string} regionSlug
       */
      onRegionChange: async (regionSlug) => {
        placesApi.placesCtx = await loadLandingPlacesCtx(
          regionOptions,
          regionSlug,
          featuredLive?.season_id || null
        );
      },
    };
    bindPublicNetworksPortal(cards, placesApi);
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

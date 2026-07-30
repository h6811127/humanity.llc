/**
 * Landing places strip boot helpers — fetch pin index + snapshot + near-me + region picker.
 * Used by public-networks-portal on `/` only (WS-DISCOVER-P5a/b/c).
 */
import {
  DISCOVERY_NEAR_ME_PRIVACY_COPY,
  DISCOVERY_NEAR_ME_PRIVACY_HREF,
  LANDING_DEFAULT_DISCOVERY_REGION,
  LANDING_PLACES_FAR_AWAY_METERS,
  LANDING_PLACES_NEAR_ME_CTA,
  LANDING_PLACES_REGIONS_URL,
  LANDING_PLACES_SECTION_TITLE,
  buildLandingPlacesRows,
  formatLandingPlacesFarAwayNotice,
  formatLandingPlacesLead,
  landingPlacesBrowseHref,
  normalizeLandingPlacesRegions,
  landingPlacesDefaultRegion,
  renderLandingPlacesResults,
  resolveLandingCategoryPinFacet,
  resolveLandingPlacesNearestMeters,
  resolveLandingShelfPinFacet,
} from "./landing-places-core.mjs";
import {
  LANDING_PLACES_ALL_REGIONS_CTA,
  LANDING_PLACES_ALL_REGIONS_HREF,
  buildLandingPlacesRegionOptions,
  cityLabelForLandingPlacesRegion,
  readLandingPlacesRegionPreference,
  readLandingPlacesRegionQueryParam,
  renderLandingPlacesRegionOptionsHtml,
  resolveLandingPlacesRegion,
  seasonIdForLandingPlacesRegion,
  writeLandingPlacesRegionPreference,
} from "./landing-places-region-core.mjs";
import { discoveryPinIndexUrl } from "./discovery-region-path-core.mjs";
import {
  buildSnapshotNodeIndex,
  fetchDiscoverySeasonSnapshot,
} from "./discovery-pin-snapshot-core.mjs";
import { requestDiscoveryClientCoords } from "./discovery-near-me-core.mjs";

/** @typedef {import("./landing-places-region-core.mjs").LandingPlacesRegionOption} LandingPlacesRegionOption */

/**
 * @param {string} [region]
 */
export async function fetchLandingPinIndex(region = LANDING_DEFAULT_DISCOVERY_REGION) {
  const url = discoveryPinIndexUrl(region);
  if (!url) return null;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`pin index ${res.status}`);
  return /** @type {{ region?: string; pins?: unknown[] }} */ (await res.json());
}

/**
 * Landing catalog (may include empty template regions beyond listed seasons).
 * @param {string} [url]
 */
export async function fetchLandingPlacesRegionOptions(url = LANDING_PLACES_REGIONS_URL) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`landing regions ${res.status}`);
  const raw = await res.json();
  const regions = normalizeLandingPlacesRegions(raw);
  const defaultRegion = landingPlacesDefaultRegion(regions, raw);
  /** @type {import("./discovery-regions-index-core.mjs").DiscoveryRegionHubEntry[]} */
  const hubLike = regions.map((row) => ({
    region_slug: row.region_slug,
    browse_href: landingPlacesBrowseHref(row.region_slug),
    label: row.label,
    city: row.city,
    summary: row.summary ?? "",
    season_id: row.season_id ?? "",
    network_display_name: row.label,
    rules_path: null,
  }));
  return {
    options: buildLandingPlacesRegionOptions(hubLike),
    defaultRegion,
  };
}

/**
 * @param {string | null | undefined} seasonId
 * @param {string} [origin]
 */
export async function fetchLandingPlacesSnapshotIndex(seasonId, origin) {
  const id = String(seasonId ?? "").trim();
  if (!id) return buildSnapshotNodeIndex(null);
  const snapshot = await fetchDiscoverySeasonSnapshot(
    id,
    origin ?? (typeof location !== "undefined" ? location.origin : "")
  );
  return buildSnapshotNodeIndex(snapshot);
}

/**
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} selectedSlug
 */
export function paintLandingPlacesRegionPicker(options, selectedSlug) {
  const select = document.getElementById("landing-places-region");
  const allLink = document.getElementById("landing-places-all-regions");
  if (select instanceof HTMLSelectElement) {
    const selected = resolveLandingPlacesRegion({
      availableSlugs: options.map((row) => row.region_slug),
      queryRegion: selectedSlug,
      fallback: LANDING_DEFAULT_DISCOVERY_REGION,
    });
    const currentValues = Array.from(select.options)
      .map((opt) => opt.value)
      .join("\0");
    const nextValues = options.map((row) => row.region_slug).join("\0");
    // Avoid rewriting <option>s on every paint — that can clobber an in-flight
    // user selection before the change handler finishes loading the new region.
    if (currentValues !== nextValues) {
      select.innerHTML = renderLandingPlacesRegionOptionsHtml(options, selected);
    }
    select.value = selected;
    select.disabled = options.length < 2;
  }
  if (allLink instanceof HTMLAnchorElement) {
    allLink.href = LANDING_PLACES_ALL_REGIONS_HREF;
    allLink.textContent = LANDING_PLACES_ALL_REGIONS_CTA;
  }
}

/**
 * @param {{
 *   pins: import("./discovery-pin-projection-core.mjs").DiscoveryPin[];
 *   region: string;
 *   query?: string;
 *   facet?: import("./landing-places-core.mjs").LandingPinFacet;
 *   snapshotIndex?: ReturnType<typeof buildSnapshotNodeIndex> | null;
 *   cityLabel?: string;
 *   clientCoords?: import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null;
 *   regionOptions?: LandingPlacesRegionOption[];
 * }} state
 */
export function paintLandingPlacesSection(state) {
  const resultsRoot = document.getElementById("landing-places-results");
  const leadEl = document.getElementById("landing-places-lead");
  const nearMeBtn = document.getElementById("landing-places-near-me");
  const titleEl = document.getElementById("landing-places-title");
  const privacyEl = document.getElementById("landing-places-privacy");
  const densityEl = document.getElementById("landing-places-density");
  if (!(resultsRoot instanceof HTMLElement)) return;

  const region = state.region || LANDING_DEFAULT_DISCOVERY_REGION;
  const browseHref = landingPlacesBrowseHref(region);
  const nearMeActive = Boolean(state.clientCoords);
  const model = buildLandingPlacesRows(state.pins, {
    region,
    query: state.query,
    facet: state.facet,
    snapshotIndex: state.snapshotIndex ?? null,
    clientCoords: state.clientCoords ?? null,
  });

  if (state.regionOptions?.length) {
    paintLandingPlacesRegionPicker(state.regionOptions, region);
  }

  if (titleEl instanceof HTMLElement) {
    titleEl.textContent = LANDING_PLACES_SECTION_TITLE;
  }
  if (leadEl instanceof HTMLElement) {
    leadEl.textContent = formatLandingPlacesLead({
      cityLabel: state.cityLabel,
      pinCount: state.pins.length,
      nearMeActive,
    });
  }
  if (privacyEl instanceof HTMLElement) {
    privacyEl.innerHTML = `${DISCOVERY_NEAR_ME_PRIVACY_COPY} <a href="${DISCOVERY_NEAR_ME_PRIVACY_HREF}">Data policy</a>.`;
  }
  if (nearMeBtn instanceof HTMLButtonElement) {
    nearMeBtn.textContent = LANDING_PLACES_NEAR_ME_CTA;
    nearMeBtn.classList.toggle("landing-places-near-me-btn--active", nearMeActive);
    nearMeBtn.setAttribute("aria-pressed", nearMeActive ? "true" : "false");
  }

  if (densityEl instanceof HTMLElement) {
    const notice = nearMeActive
      ? formatLandingPlacesFarAwayNotice({
          cityLabel: state.cityLabel,
          nearestMeters: resolveLandingPlacesNearestMeters(model.distancesByPinId),
          farAwayMeters: LANDING_PLACES_FAR_AWAY_METERS,
        })
      : null;
    densityEl.hidden = !notice;
    densityEl.textContent = notice ?? "";
  }

  resultsRoot.innerHTML = renderLandingPlacesResults(model, {
    browseHref,
    sourcePinCount: state.pins.length,
    facet: state.facet,
    query: state.query,
    cityLabel: state.cityLabel,
  });
}

/**
 * @param {{
 *   getClientCoords: () => import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null;
 *   setClientCoords: (coords: import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null) => void;
 *   render: () => void;
 * }} handlers
 */
export function bindLandingPlacesNearMe(handlers) {
  const nearMeBtn = document.getElementById("landing-places-near-me");
  const statusEl = document.getElementById("landing-places-near-me-status");
  if (!(nearMeBtn instanceof HTMLButtonElement)) return;

  nearMeBtn.addEventListener("click", async () => {
    nearMeBtn.disabled = true;
    if (statusEl instanceof HTMLElement) {
      statusEl.textContent = "Requesting location on your device…";
    }
    try {
      const coords = await requestDiscoveryClientCoords();
      handlers.setClientCoords(coords);
      if (statusEl instanceof HTMLElement) {
        statusEl.textContent = "Sorted nearest first on this device.";
      }
      handlers.render();
    } catch {
      handlers.setClientCoords(null);
      if (statusEl instanceof HTMLElement) {
        statusEl.textContent =
          "Location unavailable — showing alphabetical order. Enable location in browser settings to sort near me.";
      }
      handlers.render();
    } finally {
      nearMeBtn.disabled = false;
    }
  });
}

/**
 * @param {{
 *   onRegionChange: (regionSlug: string) => void | Promise<void>;
 * }} handlers
 */
export function bindLandingPlacesRegionPicker(handlers) {
  const select = document.getElementById("landing-places-region");
  if (!(select instanceof HTMLSelectElement)) return;
  select.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const slug = String(target.value ?? "").trim();
    if (!slug) return;
    writeLandingPlacesRegionPreference(
      slug,
      typeof localStorage !== "undefined" ? localStorage : null
    );
    void handlers.onRegionChange(slug);
  });
}

/**
 * Keep `?region=` in sync without dropping other landing query params.
 * @param {string} regionSlug
 * @param {string} [defaultRegion]
 */
export function syncLandingRegionQueryParam(
  regionSlug,
  defaultRegion = LANDING_DEFAULT_DISCOVERY_REGION
) {
  if (typeof window === "undefined" || typeof history?.replaceState !== "function") {
    return;
  }
  const slug = String(regionSlug ?? "").trim();
  const url = new URL(window.location.href);
  if (slug && slug !== defaultRegion) {
    url.searchParams.set("region", slug);
  } else {
    url.searchParams.delete("region");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) history.replaceState(null, "", next);
}

/**
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} [search]
 * @param {Storage | null} [storage]
 * @param {string} [fallback]
 */
export function resolveLandingPlacesRegionSelection(
  options,
  search = "",
  storage = null,
  fallback = LANDING_DEFAULT_DISCOVERY_REGION
) {
  return resolveLandingPlacesRegion({
    availableSlugs: options.map((row) => row.region_slug),
    queryRegion: readLandingPlacesRegionQueryParam(search),
    preferredRegion: readLandingPlacesRegionPreference(storage),
    fallback,
  });
}

export {
  cityLabelForLandingPlacesRegion,
  seasonIdForLandingPlacesRegion,
  resolveLandingCategoryPinFacet,
  resolveLandingShelfPinFacet,
  LANDING_DEFAULT_DISCOVERY_REGION,
  landingPlacesBrowseHref,
  readLandingPlacesRegionQueryParam,
};

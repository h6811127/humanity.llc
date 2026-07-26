/**
 * Landing places strip boot helpers — fetch pin index + optional snapshot + near-me.
 * Used by public-networks-portal on `/` only (WS-DISCOVER-P5a/b).
 */
import {
  DISCOVERY_NEAR_ME_PRIVACY_COPY,
  DISCOVERY_NEAR_ME_PRIVACY_HREF,
  LANDING_DEFAULT_DISCOVERY_REGION,
  LANDING_PLACES_NEAR_ME_CTA,
  LANDING_PLACES_SECTION_TITLE,
  buildLandingPlacesRows,
  formatLandingPlacesLead,
  landingPlacesBrowseHref,
  renderLandingPlacesResults,
  resolveLandingCategoryPinFacet,
  resolveLandingShelfPinFacet,
} from "./landing-places-core.mjs";
import { discoveryPinIndexUrl } from "./discovery-region-path-core.mjs";
import {
  buildSnapshotNodeIndex,
  fetchDiscoverySeasonSnapshot,
} from "./discovery-pin-snapshot-core.mjs";
import { requestDiscoveryClientCoords } from "./discovery-near-me-core.mjs";

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
 * @param {{
 *   pins: import("./discovery-pin-projection-core.mjs").DiscoveryPin[];
 *   region: string;
 *   query?: string;
 *   facet?: import("./landing-places-core.mjs").LandingPinFacet;
 *   snapshotIndex?: ReturnType<typeof buildSnapshotNodeIndex> | null;
 *   cityLabel?: string;
 *   clientCoords?: import("./discovery-near-me-core.mjs").DiscoveryClientCoords | null;
 * }} state
 */
export function paintLandingPlacesSection(state) {
  const resultsRoot = document.getElementById("landing-places-results");
  const leadEl = document.getElementById("landing-places-lead");
  const nearMeBtn = document.getElementById("landing-places-near-me");
  const titleEl = document.getElementById("landing-places-title");
  const privacyEl = document.getElementById("landing-places-privacy");
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

  resultsRoot.innerHTML = renderLandingPlacesResults(model, {
    browseHref,
    sourcePinCount: state.pins.length,
    facet: state.facet,
    query: state.query,
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

export {
  resolveLandingCategoryPinFacet,
  resolveLandingShelfPinFacet,
  LANDING_DEFAULT_DISCOVERY_REGION,
  landingPlacesBrowseHref,
};

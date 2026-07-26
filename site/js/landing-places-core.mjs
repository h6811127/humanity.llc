/**
 * Landing places strip (WS-DISCOVER-P5a/b) — DiscoveryPin preview on `/`.
 * P5b: client-side Sort near me on `/` (geolocation allowed; coords never sent for ranking).
 * @see docs/DISCOVERY_PROJECTION.md § WS-DISCOVER-P5
 */
import { DEFAULT_DISCOVERY_REGION } from "./discovery-pin-projection-core.mjs";
import {
  DISCOVERY_NEAR_ME_BUTTON_LABEL,
  buildDiscoveryPinRowModel,
  escapeDiscoveryHtml,
  filterDiscoveryPinsByQuery,
  renderDiscoveryPinRows,
  sortDiscoveryPinsByLabel,
} from "./discovery-region-browse-core.mjs";
import { discoveryRegionBrowsePath } from "./discovery-region-path-core.mjs";
import { resolveDiscoveryPinRowStateHeadline } from "./discovery-pin-snapshot-core.mjs";
import {
  DISCOVERY_NEAR_ME_PRIVACY_COPY,
  DISCOVERY_NEAR_ME_PRIVACY_HREF,
  sortDiscoveryPinsByNearMe,
} from "./discovery-near-me-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */
/** @typedef {import("./public-networks-portal-core.mjs").PublicNetworkCategoryFilter} PublicNetworkCategoryFilter */
/** @typedef {import("./discovery-near-me-core.mjs").DiscoveryClientCoords} DiscoveryClientCoords */

export const LANDING_DEFAULT_DISCOVERY_REGION = DEFAULT_DISCOVERY_REGION;
export const LANDING_PLACES_PREVIEW_LIMIT = 12;
export const LANDING_PLACES_NEAR_ME_CTA = DISCOVERY_NEAR_ME_BUTTON_LABEL;
export const LANDING_PLACES_SEE_ALL_CTA = "See all places";
export const LANDING_PLACES_SECTION_TITLE = "Places near me";
export { DISCOVERY_NEAR_ME_PRIVACY_COPY, DISCOVERY_NEAR_ME_PRIVACY_HREF };

/** @typedef {"all" | "live_now" | "open_paused" | "return_hours"} LandingPinFacet */

/** @type {Record<string, LandingPinFacet>} */
export const LANDING_SHELF_PIN_FACETS = {
  "landing-shelf-live-now": "live_now",
  "landing-shelf-open-paused": "open_paused",
  "landing-shelf-return-hours": "return_hours",
};

/**
 * @param {string} shelfId
 * @returns {LandingPinFacet}
 */
export function resolveLandingShelfPinFacet(shelfId) {
  const id = String(shelfId ?? "").trim();
  return LANDING_SHELF_PIN_FACETS[id] ?? "all";
}

/**
 * Map portal category chips to pin facets when possible.
 * @param {PublicNetworkCategoryFilter | string} category
 * @returns {LandingPinFacet}
 */
export function resolveLandingCategoryPinFacet(category) {
  const cat = String(category ?? "all").trim();
  if (cat === "city_games") return "live_now";
  if (cat === "resources") return "open_paused";
  return "all";
}

/**
 * @param {DiscoveryPin} pin
 */
function pinObjectType(pin) {
  return String(pin.facets?.object_type ?? pin.listing?.category ?? "").trim();
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {LandingPinFacet} facet
 */
export function filterLandingPinsByFacet(pins, facet) {
  const f = String(facet ?? "all").trim() || "all";
  if (f === "all") return pins;
  return pins.filter((pin) => {
    const type = pinObjectType(pin);
    if (f === "live_now") return type === "game_node";
    if (f === "open_paused") {
      return type === "status_plate" || type === "resource_board";
    }
    if (f === "return_hours") {
      return type === "lost_item_relay" || type === "status_plate";
    }
    return true;
  });
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {{
 *   query?: string;
 *   facet?: LandingPinFacet;
 *   limit?: number;
 *   clientCoords?: DiscoveryClientCoords | null;
 * }} [opts]
 */
export function selectLandingPlacesPreview(pins, opts = {}) {
  const query = String(opts.query ?? "");
  const facet = /** @type {LandingPinFacet} */ (opts.facet ?? "all");
  const limit =
    typeof opts.limit === "number" && opts.limit > 0
      ? opts.limit
      : LANDING_PLACES_PREVIEW_LIMIT;
  const filtered = filterLandingPinsByFacet(
    filterDiscoveryPinsByQuery(pins, query),
    facet
  );

  if (opts.clientCoords) {
    const near = sortDiscoveryPinsByNearMe(filtered, opts.clientCoords);
    return {
      totalMatching: near.pins.length,
      pins: near.pins.slice(0, limit),
      truncated: near.pins.length > limit,
      distancesByPinId: near.distancesByPinId,
      nearMeActive: true,
    };
  }

  const sorted = sortDiscoveryPinsByLabel(filtered);
  return {
    totalMatching: sorted.length,
    pins: sorted.slice(0, limit),
    truncated: sorted.length > limit,
    distancesByPinId: /** @type {Map<string, number>} */ (new Map()),
    nearMeActive: false,
  };
}

/**
 * @param {string} [region]
 */
export function landingPlacesBrowseHref(region = LANDING_DEFAULT_DISCOVERY_REGION) {
  return discoveryRegionBrowsePath(region) ?? `/discover/${LANDING_DEFAULT_DISCOVERY_REGION}/`;
}

/**
 * @param {{
 *   region?: string;
 *   cityLabel?: string;
 *   pinCount?: number | null;
 *   nearMeActive?: boolean;
 * }} [ctx]
 */
export function formatLandingPlacesLead(ctx = {}) {
  const city = String(ctx.cityLabel ?? "Cedar Rapids").trim() || "Cedar Rapids";
  const count = ctx.pinCount;
  const countBit =
    typeof count === "number" && count > 0
      ? `${count} listed place${count === 1 ? "" : "s"} in ${city}`
      : `Listed places in ${city}`;
  if (ctx.nearMeActive) {
    return `${countBit}. Sorted nearest first on this device.`;
  }
  return `${countBit}. Sort near me uses location on your device; scans are not tracked.`;
}

/**
 * @param {{ totalMatching: number; truncated: boolean; hasPins: boolean; facet?: LandingPinFacet; query?: string }} ctx
 */
export function landingPlacesEmptyMessage(ctx) {
  if (!ctx.hasPins) {
    return "No listed places for this region yet.";
  }
  const facet = String(ctx.facet ?? "all");
  const q = String(ctx.query ?? "").trim();
  if (q) return "No places match this search.";
  if (facet === "live_now") return "No live game places match this shelf.";
  if (facet === "open_paused") return "No open/paused resource places match this shelf.";
  if (facet === "return_hours") return "No return, relay, or hours places match this shelf.";
  return "No places match.";
}

/**
 * @param {DiscoveryPin[]} pins
 * @param {{
 *   region: string;
 *   query?: string;
 *   facet?: LandingPinFacet;
 *   limit?: number;
 *   snapshotIndex?: ReturnType<typeof import("./discovery-pin-snapshot-core.mjs").buildSnapshotNodeIndex> | null;
 *   clientCoords?: DiscoveryClientCoords | null;
 * }} opts
 */
export function buildLandingPlacesRows(pins, opts) {
  const region = String(opts.region ?? LANDING_DEFAULT_DISCOVERY_REGION).trim();
  const preview = selectLandingPlacesPreview(pins, {
    query: opts.query,
    facet: opts.facet,
    limit: opts.limit,
    clientCoords: opts.clientCoords ?? null,
  });
  const snapshotIndex = opts.snapshotIndex ?? null;
  const rows = preview.pins.map((pin) =>
    buildDiscoveryPinRowModel(pin, {
      region,
      distanceMeters: preview.distancesByPinId.get(pin.pin_id) ?? null,
      stateHeadline: snapshotIndex
        ? resolveDiscoveryPinRowStateHeadline(pin, snapshotIndex)
        : null,
    })
  );
  return { ...preview, rows, region };
}

/**
 * @param {ReturnType<typeof buildLandingPlacesRows>} model
 * @param {{
 *   browseHref?: string;
 *   sourcePinCount?: number;
 *   facet?: LandingPinFacet;
 *   query?: string;
 * }} [opts]
 */
export function renderLandingPlacesResults(model, opts = {}) {
  const browseHref = opts.browseHref ?? landingPlacesBrowseHref(model.region);
  if (!model.rows.length) {
    const empty = landingPlacesEmptyMessage({
      hasPins: (opts.sourcePinCount ?? 0) > 0 || model.totalMatching > 0,
      totalMatching: model.totalMatching,
      truncated: model.truncated,
      facet: opts.facet,
      query: opts.query,
    });
    return `<p class="landing-places-empty discovery-region-empty">${escapeDiscoveryHtml(empty)}</p>
<p class="landing-places-more idea-footnote"><a id="landing-places-see-all" href="${escapeDiscoveryHtml(browseHref)}">${escapeDiscoveryHtml(LANDING_PLACES_SEE_ALL_CTA)}</a></p>`;
  }
  const list = renderDiscoveryPinRows(model.rows);
  const moreLabel = model.truncated
    ? `${LANDING_PLACES_SEE_ALL_CTA} (${model.totalMatching})`
    : LANDING_PLACES_SEE_ALL_CTA;
  const more = `<p class="landing-places-more idea-footnote"><a id="landing-places-see-all" href="${escapeDiscoveryHtml(browseHref)}">${escapeDiscoveryHtml(moreLabel)}</a></p>`;
  return `${list}${more}`;
}

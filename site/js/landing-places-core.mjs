/**
 * Landing places strip (WS-DISCOVER-P5a/b/c) — DiscoveryPin preview on `/`.
 * P5b: client-side Sort near me on `/` (geolocation allowed; coords never sent for ranking).
 * P5c: multi-region picker + preferred region (query / localStorage / default).
 * @see docs/DISCOVERY_PROJECTION.md § WS-DISCOVER-P5
 */
import {
  DEFAULT_DISCOVERY_REGION,
  slugifyDiscoveryRegion,
} from "./discovery-pin-projection-core.mjs";
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
  formatDiscoveryNearMeDistance,
  sortDiscoveryPinsByNearMe,
} from "./discovery-near-me-core.mjs";
import {
  LANDING_PLACES_ALL_REGIONS_CTA,
  LANDING_PLACES_ALL_REGIONS_HREF,
  LANDING_PLACES_REGION_STORAGE_KEY,
} from "./landing-places-region-core.mjs";

/** @typedef {import("./discovery-pin-projection-core.mjs").DiscoveryPin} DiscoveryPin */
/** @typedef {import("./public-networks-portal-core.mjs").PublicNetworkCategoryFilter} PublicNetworkCategoryFilter */
/** @typedef {import("./discovery-near-me-core.mjs").DiscoveryClientCoords} DiscoveryClientCoords */

/**
 * @typedef {Object} LandingPlacesRegion
 * @property {string} region_slug
 * @property {string} label
 * @property {string} city
 * @property {string | null} [season_id]
 * @property {string} [summary]
 */

export const LANDING_DEFAULT_DISCOVERY_REGION = DEFAULT_DISCOVERY_REGION;
export const LANDING_PLACES_PREVIEW_LIMIT = 12;
export const LANDING_PLACES_NEAR_ME_CTA = DISCOVERY_NEAR_ME_BUTTON_LABEL;
export const LANDING_PLACES_SEE_ALL_CTA = "See all places";
export const LANDING_PLACES_SECTION_TITLE = "Places near me";
export const LANDING_PLACES_REGIONS_URL = "/data/discovery-landing-regions.json";
/** Nearest listed pin beyond this → far-away density notice (client-only). */
export const LANDING_PLACES_FAR_AWAY_METERS = 80_000;
export { DISCOVERY_NEAR_ME_PRIVACY_COPY, DISCOVERY_NEAR_ME_PRIVACY_HREF, LANDING_PLACES_REGION_STORAGE_KEY };

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
 * @param {unknown} raw
 * @returns {LandingPlacesRegion[]}
 */
export function normalizeLandingPlacesRegions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const rows = Array.isArray(doc.regions) ? doc.regions : [];
  /** @type {LandingPlacesRegion[]} */
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    const slug = slugifyDiscoveryRegion(String(r.region_slug ?? ""));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      region_slug: slug,
      label: String(r.label ?? slug).trim() || slug,
      city: String(r.city ?? "").trim(),
      season_id: r.season_id == null ? null : String(r.season_id).trim() || null,
      summary: String(r.summary ?? "").trim(),
    });
  }
  return out;
}

/**
 * @param {LandingPlacesRegion[]} regions
 * @param {unknown} raw
 */
export function landingPlacesDefaultRegion(regions, raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const fromDoc = slugifyDiscoveryRegion(
      String(/** @type {Record<string, unknown>} */ (raw).default_region ?? "")
    );
    if (fromDoc && regions.some((r) => r.region_slug === fromDoc)) return fromDoc;
  }
  if (regions.some((r) => r.region_slug === LANDING_DEFAULT_DISCOVERY_REGION)) {
    return LANDING_DEFAULT_DISCOVERY_REGION;
  }
  return regions[0]?.region_slug ?? LANDING_DEFAULT_DISCOVERY_REGION;
}

/**
 * @param {Map<string, number> | null | undefined} distancesByPinId
 * @returns {number | null}
 */
export function resolveLandingPlacesNearestMeters(distancesByPinId) {
  if (!distancesByPinId || typeof distancesByPinId.values !== "function") return null;
  let nearest = null;
  for (const meters of distancesByPinId.values()) {
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) continue;
    if (nearest == null || meters < nearest) nearest = meters;
  }
  return nearest;
}

/**
 * @param {{
 *   cityLabel?: string;
 *   nearestMeters?: number | null;
 *   farAwayMeters?: number;
 * }} [ctx]
 * @returns {string | null}
 */
export function formatLandingPlacesFarAwayNotice(ctx = {}) {
  const nearest = ctx.nearestMeters;
  const threshold =
    typeof ctx.farAwayMeters === "number" && ctx.farAwayMeters > 0
      ? ctx.farAwayMeters
      : LANDING_PLACES_FAR_AWAY_METERS;
  if (typeof nearest !== "number" || !Number.isFinite(nearest) || nearest < threshold) {
    return null;
  }
  const city = String(ctx.cityLabel ?? "this region").trim() || "this region";
  const dist = formatDiscoveryNearMeDistance(nearest);
  const distBit = dist ? ` (nearest listed place ~${dist})` : "";
  return `Looks like you're far from ${city}${distBit}. Showing that region's places — or browse other regions.`;
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
 * @param {{
 *   totalMatching: number;
 *   truncated: boolean;
 *   hasPins: boolean;
 *   facet?: LandingPinFacet;
 *   query?: string;
 *   cityLabel?: string;
 * }} ctx
 */
export function landingPlacesEmptyMessage(ctx) {
  if (!ctx.hasPins) {
    const city = String(ctx.cityLabel ?? "").trim();
    return city
      ? `No listed places in ${city} yet. Browse other regions or check back soon.`
      : "No listed places for this region yet. Browse other regions or check back soon.";
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
 *   cityLabel?: string;
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
      cityLabel: opts.cityLabel,
    });
    return `<p class="landing-places-empty discovery-region-empty">${escapeDiscoveryHtml(empty)}</p>
<p class="landing-places-more idea-footnote"><a href="${escapeDiscoveryHtml(LANDING_PLACES_ALL_REGIONS_HREF)}">${escapeDiscoveryHtml(LANDING_PLACES_ALL_REGIONS_CTA)}</a> · <a id="landing-places-see-all" href="${escapeDiscoveryHtml(browseHref)}">${escapeDiscoveryHtml(LANDING_PLACES_SEE_ALL_CTA)}</a></p>`;
  }
  const list = renderDiscoveryPinRows(model.rows);
  const moreLabel = model.truncated
    ? `${LANDING_PLACES_SEE_ALL_CTA} (${model.totalMatching})`
    : LANDING_PLACES_SEE_ALL_CTA;
  const more = `<p class="landing-places-more idea-footnote"><a id="landing-places-see-all" href="${escapeDiscoveryHtml(browseHref)}">${escapeDiscoveryHtml(moreLabel)}</a></p>`;
  return `${list}${more}`;
}

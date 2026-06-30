/**
 * Object- and network-level public_listing schema for the discovery plane.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1
 */

/** @typedef {'district' | 'block' | 'entrance' | 'exact'} DiscoveryGeoPrecision */

/**
 * @typedef {Object} DiscoveryPublicListingGeo
 * @property {number} latitude
 * @property {number} longitude
 * @property {DiscoveryGeoPrecision} precision
 */

/**
 * @typedef {Object} DiscoveryPublicListing
 * @property {boolean} listed
 * @property {boolean} explicitlySet
 * @property {string | null} title
 * @property {string | null} summary
 * @property {string | null} region
 * @property {string | null} category
 * @property {DiscoveryPublicListingGeo | null} geo
 */

export const DISCOVERY_GEO_PRECISION_TIERS = /** @type {const} */ ([
  "district",
  "block",
  "entrance",
  "exact",
]);

/**
 * @param {unknown} value
 * @returns {DiscoveryGeoPrecision | null}
 */
export function normalizeDiscoveryGeoPrecision(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (DISCOVERY_GEO_PRECISION_TIERS.includes(/** @type {DiscoveryGeoPrecision} */ (raw))) {
    return /** @type {DiscoveryGeoPrecision} */ (raw);
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {DiscoveryPublicListingGeo | null}
 */
export function parseDiscoveryPublicListingGeo(raw) {
  if (!raw || typeof raw !== "object") return null;
  const geo = /** @type {Record<string, unknown>} */ (raw);
  const latitude = Number(geo.latitude);
  const longitude = Number(geo.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const precision = normalizeDiscoveryGeoPrecision(geo.precision) ?? "block";
  return { latitude, longitude, precision };
}

/**
 * @param {unknown} raw
 * @returns {DiscoveryPublicListing}
 */
export function parseDiscoveryPublicListing(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      listed: false,
      explicitlySet: false,
      title: null,
      summary: null,
      region: null,
      category: null,
      geo: null,
    };
  }
  const listing = /** @type {Record<string, unknown>} */ (raw);
  const listed = listing.listed === true;
  const title =
    typeof listing.title === "string" && listing.title.trim() ? listing.title.trim() : null;
  const summary =
    typeof listing.summary === "string" && listing.summary.trim()
      ? listing.summary.trim()
      : null;
  const region =
    typeof listing.region === "string" && listing.region.trim() ? listing.region.trim() : null;
  const category =
    typeof listing.category === "string" && listing.category.trim()
      ? listing.category.trim()
      : null;
  return {
    listed,
    explicitlySet: listing.listed === true || listing.listed === false,
    title,
    summary,
    region,
    category,
    geo: parseDiscoveryPublicListingGeo(listing.geo),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function parseDiscoveryPublicListingFromRow(row) {
  return parseDiscoveryPublicListing(row?.public_listing);
}

/**
 * Whether a resolver row is listed for discovery projection.
 *
 * Policy:
 * 1. `public_listing.listed === false` → not listed
 * 2. `public_listing.listed === true` → listed
 * 3. Listed season registry node without object listing → inherit season listing (P0 compat)
 * 4. Otherwise → default deny
 *
 * @param {Record<string, unknown>} row
 * @param {{ seasonListed?: boolean; onSeasonRegistry?: boolean }} [ctx]
 */
export function isObjectListedForDiscovery(row, ctx = {}) {
  const listing = parseDiscoveryPublicListingFromRow(row);
  if (listing.explicitlySet && !listing.listed) return false;
  if (listing.listed) return true;
  if (ctx.onSeasonRegistry && ctx.seasonListed) return true;
  return false;
}

/**
 * @param {DiscoveryPublicListing} listing
 * @param {string | null | undefined} fallbackLabel
 */
export function discoveryListingDisplayTitle(listing, fallbackLabel) {
  return (listing.title ?? String(fallbackLabel ?? "").trim()) || null;
}

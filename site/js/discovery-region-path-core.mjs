/**
 * Discovery browse URL helpers — region list + pin detail paths.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-3
 */
import { slugifyDiscoveryRegion } from "./discovery-pin-projection-core.mjs";

/**
 * @typedef {"browse" | "pin"} DiscoveryPathMode
 * @typedef {{ mode: "browse"; region: string } | { mode: "pin"; region: string; pinId: string }} DiscoveryPathContext
 */

/**
 * @param {string} region
 */
export function discoveryPinIndexUrl(region) {
  const slug = slugifyDiscoveryRegion(region);
  return slug ? `/data/discovery-${slug}.json` : null;
}

/**
 * @param {string} region
 */
export function discoveryRegionBrowsePath(region) {
  const slug = slugifyDiscoveryRegion(region);
  return slug ? `/discover/${slug}/` : null;
}

/**
 * Share/bookmark path — requires Pages splat rewrite to `/discover/pin/`.
 * @param {string} region
 * @param {string} pinId
 */
export function discoveryPinDetailPath(region, pinId) {
  const slug = slugifyDiscoveryRegion(region);
  const id = String(pinId ?? "").trim();
  if (!slug || !id) return null;
  return `/discover/${slug}/pin/${encodeURIComponent(id)}/`;
}

/**
 * In-app browse detail — same region shell, no rewrite required.
 * @param {string} region
 * @param {string} pinId
 */
export function discoveryPinBrowseQueryPath(region, pinId) {
  const browse = discoveryRegionBrowsePath(region);
  const id = String(pinId ?? "").trim();
  if (!browse || !id) return null;
  return `${browse}?pin=${encodeURIComponent(id)}`;
}

/**
 * @param {string | null | undefined} search
 */
export function parseDiscoveryBrowseQuery(search) {
  const raw = String(search ?? "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const pinId = params.get("pin")?.trim();
  return pinId || null;
}

/**
 * @param {string | null | undefined} pathname
 * @returns {DiscoveryPathContext | null}
 */
export function parseDiscoveryPathname(pathname) {
  const trimmed = String(pathname ?? "")
    .trim()
    .replace(/\/+$/, "");
  const browseMatch = trimmed.match(/^\/discover\/([^/]+)$/);
  if (browseMatch) {
    return { mode: "browse", region: decodeURIComponent(browseMatch[1]) };
  }
  const pinMatch = trimmed.match(/^\/discover\/([^/]+)\/pin\/([^/]+)$/);
  if (pinMatch) {
    return {
      mode: "pin",
      region: decodeURIComponent(pinMatch[1]),
      pinId: decodeURIComponent(pinMatch[2]),
    };
  }
  return null;
}

/**
 * @param {unknown} listing
 * @param {unknown} [cityFallback]
 */
export function resolveDiscoveryRegionSlug(listing, cityFallback) {
  const fromListing =
    listing && typeof listing === "object"
      ? slugifyDiscoveryRegion(/** @type {{ region?: string }} */ (listing).region ?? "")
      : "";
  if (fromListing) return fromListing;
  return slugifyDiscoveryRegion(String(cityFallback ?? ""));
}

/**
 * @param {Record<string, unknown>} [row]
 * @param {Record<string, unknown> | null} [seasonConfig]
 */
export function resolveDiscoveryRegionSlugFromSeasonRow(row, seasonConfig = null) {
  const listing = row?.public_listing ?? seasonConfig?.public_listing;
  const city = row?.city ?? seasonConfig?.city;
  return resolveDiscoveryRegionSlug(listing, city);
}

/**
 * @param {string} region
 * @param {{ seasons?: Array<Record<string, unknown>> }} [seasonsIndex]
 */
export function discoverySeasonJsonUrlForRegion(region, seasonsIndex) {
  const slug = slugifyDiscoveryRegion(region);
  if (!slug) return null;
  for (const row of seasonsIndex?.seasons ?? []) {
    const rowSlug = resolveDiscoveryRegionSlugFromSeasonRow(row);
    if (rowSlug === slug) {
      const jsonUrl = String(row.json_url ?? "").trim();
      if (jsonUrl) return jsonUrl;
    }
  }
  return null;
}

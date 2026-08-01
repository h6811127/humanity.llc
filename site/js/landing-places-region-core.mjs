/**
 * Landing places region preference (WS-DISCOVER-P5c).
 * Client-only default region beyond the Cedar Rapids pilot hardcode.
 * @see docs/DISCOVERY_PROJECTION.md § WS-DISCOVER-P5
 */
import {
  DEFAULT_DISCOVERY_REGION,
  slugifyDiscoveryRegion,
} from "./discovery-pin-projection-core.mjs";
import { escapeDiscoveryHtml } from "./discovery-region-browse-core.mjs";

/** @typedef {import("./discovery-regions-index-core.mjs").DiscoveryRegionHubEntry} DiscoveryRegionHubEntry */

export const LANDING_PLACES_REGION_STORAGE_KEY = "hc_landing_places_region";
export const LANDING_PLACES_ALL_REGIONS_HREF = "/discover/";
export const LANDING_PLACES_ALL_REGIONS_CTA = "All regions";
export const LANDING_PLACES_REGION_FIELD_LABEL = "Region";
/** Landing-only region list (template cities without Boards listing). */
export const LANDING_PLACES_REGIONS_URL = "/data/discovery-landing-regions.json";

/**
 * @typedef {Object} LandingPlacesRegionOption
 * @property {string} region_slug
 * @property {string} label
 * @property {string} city
 * @property {string} season_id
 * @property {string} browse_href
 */

/**
 * @param {string | null | undefined} value
 */
export function normalizeLandingPlacesRegionSlug(value) {
  return slugifyDiscoveryRegion(String(value ?? "").trim());
}

/**
 * @param {string} [search]
 * @returns {string | null}
 */
export function readLandingPlacesRegionQueryParam(search = "") {
  const raw = String(search ?? "").trim();
  if (!raw) return null;
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const slug = normalizeLandingPlacesRegionSlug(params.get("region"));
  return slug || null;
}

/**
 * @param {Storage | null | undefined} storage
 * @returns {string | null}
 */
export function readLandingPlacesRegionPreference(storage) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    return normalizeLandingPlacesRegionSlug(storage.getItem(LANDING_PLACES_REGION_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * @param {string} regionSlug
 * @param {Storage | null | undefined} storage
 */
export function writeLandingPlacesRegionPreference(regionSlug, storage) {
  const slug = normalizeLandingPlacesRegionSlug(regionSlug);
  if (!slug || !storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(LANDING_PLACES_REGION_STORAGE_KEY, slug);
  } catch {
    /* private mode / quota — preference is best-effort */
  }
}

/**
 * @param {DiscoveryRegionHubEntry[]} regions
 * @returns {LandingPlacesRegionOption[]}
 */
export function buildLandingPlacesRegionOptions(regions) {
  /** @type {LandingPlacesRegionOption[]} */
  const options = [];
  const seen = new Set();
  for (const row of regions ?? []) {
    const slug = normalizeLandingPlacesRegionSlug(row?.region_slug);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    options.push({
      region_slug: slug,
      label: String(row.city || row.label || slug).trim() || slug,
      city: String(row.city ?? "").trim(),
      season_id: String(row.season_id ?? "").trim(),
      browse_href: String(row.browse_href ?? "").trim(),
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Prefer query → stored preference → default, constrained to available slugs.
 * @param {{
 *   availableSlugs?: string[];
 *   queryRegion?: string | null;
 *   preferredRegion?: string | null;
 *   fallback?: string;
 * }} [ctx]
 */
export function resolveLandingPlacesRegion(ctx = {}) {
  const fallback =
    normalizeLandingPlacesRegionSlug(ctx.fallback) || DEFAULT_DISCOVERY_REGION;
  const available = (ctx.availableSlugs ?? [])
    .map((s) => normalizeLandingPlacesRegionSlug(s))
    .filter(Boolean);
  const allow = available.length ? new Set(available) : null;

  /** @param {string | null | undefined} candidate */
  const pick = (candidate) => {
    const slug = normalizeLandingPlacesRegionSlug(candidate);
    if (!slug) return null;
    if (allow && !allow.has(slug)) return null;
    return slug;
  };

  return (
    pick(ctx.queryRegion) ||
    pick(ctx.preferredRegion) ||
    (allow?.has(fallback) ? fallback : null) ||
    available[0] ||
    fallback
  );
}

/**
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} regionSlug
 */
export function landingPlacesRegionOption(options, regionSlug) {
  const slug = normalizeLandingPlacesRegionSlug(regionSlug);
  return options.find((row) => row.region_slug === slug) ?? null;
}

/**
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} regionSlug
 * @param {string} [fallbackCity]
 */
export function cityLabelForLandingPlacesRegion(options, regionSlug, fallbackCity = "Cedar Rapids") {
  const row = landingPlacesRegionOption(options, regionSlug);
  if (!row) return String(fallbackCity ?? "Cedar Rapids").trim() || "Cedar Rapids";
  const city = row.city.includes(",")
    ? row.city.split(",")[0].trim()
    : row.city.trim();
  if (city) return city;
  const label = row.label.trim();
  return label || String(fallbackCity ?? "Cedar Rapids").trim() || "Cedar Rapids";
}

/**
 * When the region is known, return its season_id (may be empty for template cities).
 * Fallback applies only when the region is not in the options list.
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} regionSlug
 * @param {string} [fallbackSeasonId]
 */
export function seasonIdForLandingPlacesRegion(
  options,
  regionSlug,
  fallbackSeasonId = "cr_season_01_wake"
) {
  const row = landingPlacesRegionOption(options, regionSlug);
  if (row) return String(row.season_id ?? "").trim();
  return String(fallbackSeasonId ?? "").trim() || "cr_season_01_wake";
}

/**
 * Convert landing regions registry rows into hub entries (for picker + season resolve).
 * Does not require public_listing — Example City can appear on `/` without Boards pollution.
 * @param {unknown} raw
 * @returns {DiscoveryRegionHubEntry[]}
 */
export function buildLandingPlacesHubEntriesFromRegistry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const rows = Array.isArray(doc.regions) ? doc.regions : [];
  /** @type {DiscoveryRegionHubEntry[]} */
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = /** @type {Record<string, unknown>} */ (row);
    const slug = normalizeLandingPlacesRegionSlug(r.region_slug);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const city = String(r.city ?? "").trim();
    const label = String(r.label || city || slug).trim() || slug;
    out.push({
      region_slug: slug,
      browse_href: `/discover/${slug}/`,
      label,
      city,
      summary: String(r.summary ?? "").trim(),
      season_id: r.season_id == null ? "" : String(r.season_id).trim(),
      network_display_name: label,
      rules_path: null,
    });
  }
  return out;
}

/**
 * Prefer listed season hubs; fill gaps from landing registry (template regions).
 * @param {DiscoveryRegionHubEntry[]} listedHubs
 * @param {unknown} landingRegistry
 * @returns {DiscoveryRegionHubEntry[]}
 */
export function mergeLandingPlacesHubRegions(listedHubs, landingRegistry) {
  const merged = [...(listedHubs ?? [])];
  const seen = new Set(
    merged.map((row) => normalizeLandingPlacesRegionSlug(row?.region_slug)).filter(Boolean)
  );
  for (const row of buildLandingPlacesHubEntriesFromRegistry(landingRegistry)) {
    if (seen.has(row.region_slug)) continue;
    seen.add(row.region_slug);
    merged.push(row);
  }
  return merged;
}

/**
 * Commit a loaded places ctx only when the async region load is still current.
 * Stale fetches must not mutate shared portal state (wrong pins / ?region=).
 *
 * @param {{ placesCtx?: unknown }} placesApi
 * @param {unknown} nextCtx
 * @param {number} loadGen
 * @param {number} currentGen
 * @returns {boolean} true when committed
 */
export function commitLandingPlacesRegionCtx(placesApi, nextCtx, loadGen, currentGen) {
  if (loadGen !== currentGen) return false;
  if (nextCtx) placesApi.placesCtx = nextCtx;
  return true;
}

/**
 * @param {LandingPlacesRegionOption[]} options
 * @param {string} selectedSlug
 */
export function renderLandingPlacesRegionOptionsHtml(options, selectedSlug) {
  const selected = normalizeLandingPlacesRegionSlug(selectedSlug);
  if (!options.length) {
    return `<option value="${escapeDiscoveryHtml(DEFAULT_DISCOVERY_REGION)}">Cedar Rapids, Iowa</option>`;
  }
  return options
    .map((row) => {
      const value = escapeDiscoveryHtml(row.region_slug);
      const label = escapeDiscoveryHtml(row.label);
      const isSelected = row.region_slug === selected ? " selected" : "";
      return `<option value="${value}"${isSelected}>${label}</option>`;
    })
    .join("");
}

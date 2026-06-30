/**
 * Cross-links between network lens (city board) and discovery browse.
 * @see docs/DISCOVERY_PROJECTION.md · WS-DISCOVER-P1-4
 */
import {
  discoveryPinDetailPath,
  discoveryRegionBrowsePath,
} from "./discovery-region-path-core.mjs";

export const DISCOVERY_MAP_BROWSE_NEAR_ME_CTA = "Browse places near me";
export const DISCOVERY_PIN_BOOKMARK_CTA = "Discovery pin";

/**
 * @param {string} region
 * @param {(value: string) => string} escapeHtml
 */
export function renderDiscoveryMapBrowseLink(region, escapeHtml) {
  const href = discoveryRegionBrowsePath(region);
  if (!href) return "";
  return `<a class="city-game-map-discovery-link" href="${escapeHtml(href)}">${escapeHtml(
    DISCOVERY_MAP_BROWSE_NEAR_ME_CTA
  )}</a>`;
}

/**
 * @param {string} region
 * @param {string} pinId
 * @param {(value: string) => string} escapeHtml
 */
export function renderDiscoveryPinBookmarkLink(region, pinId, escapeHtml) {
  const href = discoveryPinDetailPath(region, pinId);
  if (!href) return "";
  return `<a class="city-game-map-discovery-link city-game-map-discovery-link--secondary" href="${escapeHtml(href)}">${escapeHtml(
    DISCOVERY_PIN_BOOKMARK_CTA
  )}</a>`;
}

/**
 * @param {string | null | undefined} region
 * @param {(value: string) => string} escapeHtml
 */
export function renderDiscoveryMapCrosslinkStrip(region, escapeHtml) {
  const slug = String(region ?? "").trim();
  if (!slug) return "";
  const browse = renderDiscoveryMapBrowseLink(slug, escapeHtml);
  if (!browse) return "";
  return `<p class="city-game-map-discovery-crosslinks idea-footnote">${browse} · near-me sort on your device; scans are not tracked.</p>`;
}

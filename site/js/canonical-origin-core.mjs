/**
 * Canonical site origin helpers (RC-13).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md RC-13
 */

export const CANONICAL_SITE_HOST = "humanity.llc";

export const CANONICAL_SITE_ORIGIN = `https://${CANONICAL_SITE_HOST}`;

/**
 * @param {string} hostname
 */
export function isLocalDevHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * @param {string} hostname
 */
export function isPagesPreviewHost(hostname) {
  return hostname.endsWith(".pages.dev");
}

/**
 * @param {string} hostname
 */
export function isCanonicalSiteHost(hostname) {
  return hostname === CANONICAL_SITE_HOST;
}

/**
 * Production www host should 301 to apex before any wallet I/O.
 * @param {string} hostname
 */
export function shouldRedirectWwwToCanonical(hostname) {
  return hostname === `www.${CANONICAL_SITE_HOST}`;
}

/**
 * @param {Pick<Location, "hostname" | "pathname" | "search" | "hash">} locationLike
 */
export function buildCanonicalSiteRedirectUrl(locationLike) {
  return `${CANONICAL_SITE_ORIGIN}${locationLike.pathname || "/"}${locationLike.search || ""}${locationLike.hash || ""}`;
}

/**
 * Debug hub line when the tab origin is not the canonical production host.
 * @param {Pick<Location, "origin" | "hostname">} locationLike
 */
export function formatOriginDebugHubLine(locationLike) {
  const origin = locationLike.origin || "";
  const hostname = locationLike.hostname || "";
  if (isCanonicalSiteHost(hostname)) {
    return `Origin: ${origin} (canonical)`;
  }
  if (shouldRedirectWwwToCanonical(hostname)) {
    return `Origin: ${origin} → use ${CANONICAL_SITE_ORIGIN} (saved cards are per-origin)`;
  }
  if (isLocalDevHost(hostname)) {
    return `Origin: ${origin} (local dev)`;
  }
  if (isPagesPreviewHost(hostname)) {
    return `Origin: ${origin} (Pages preview — separate from production wallet)`;
  }
  return `Origin: ${origin} (non-canonical host)`;
}

/**
 * @param {Pick<Location, "hostname">} locationLike
 */
export function shouldShowOriginDebugInHub(locationLike) {
  const hostname = locationLike.hostname || "";
  if (isCanonicalSiteHost(hostname)) return true;
  return !isLocalDevHost(hostname);
}

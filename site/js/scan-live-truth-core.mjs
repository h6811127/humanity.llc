/**
 * Scan page live-truth gate (Phase 1) — status JSON is source of truth, not cached SSR.
 * @see docs/SCANNER_EXPERIENCE.md · docs/FLOW_2_QR_SCAN_REPAIR_SPEC.md
 */

export const SCAN_TRUTH_UNVERIFIED_BANNER =
  "Could not verify live status from the network. What you see may be outdated — refresh or try again.";

export const SCAN_TRUTH_MISMATCH_BANNER =
  "Cached page disagrees with the network. Updating live status…";

export const SCAN_TRUTH_PARTIAL_APPLY_BANNER =
  "Status strip shows live network truth. Reload the page for the full revoked view.";

export const SCAN_TRUTH_RELOAD_SESSION_PREFIX = "hc_scan_truth_reload:";

export const SCAN_TRUTH_CACHE_BUST_PARAM = "_hc_live";

/** Strip classes toggled when applying network truth to the hero. */
export const SCAN_ARRIVE_STRIP_VARIANT_CLASSES = [
  "scan-safety-strip--live",
  "scan-safety-strip--bad",
  "scan-safety-strip--warn",
  "scan-safety-strip--neutral",
];

/**
 * @param {string} origin
 * @param {string} profileId
 * @param {string} qrId
 */
export function buildScanStatusUrl(origin, profileId, qrId) {
  const base = String(origin || "").replace(/\/$/, "");
  const url = new URL(
    `${base}/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/status`
  );
  if (qrId) url.searchParams.set("q", qrId);
  return url.toString();
}

/**
 * Mirror `safetyStatusDisplay` strip labels (scan-safety.ts).
 * @param {string | null | undefined} kind
 */
export function arriveLabelForScanKind(kind) {
  switch (kind) {
    case "active":
      return "Active";
    case "qr_revoked":
    case "card_revoked":
      return "Revoked";
    case "qr_expired":
    case "card_expired":
      return "Expired";
    case "card_suspended":
      return "Suspended";
    case "qr_replaced":
      return "Replaced";
    case "unknown_profile":
    case "unknown_qr":
      return "Unknown";
    case "malformed":
    case "profile_qr_mismatch":
      return "Invalid";
    default:
      return "Unknown";
  }
}

/**
 * @param {string | null | undefined} kind
 */
export function arriveStripClassForScanKind(kind) {
  switch (kind) {
    case "active":
      return "scan-safety-strip--live";
    case "qr_revoked":
    case "card_revoked":
    case "malformed":
    case "profile_qr_mismatch":
      return "scan-safety-strip--bad";
    case "qr_expired":
    case "card_expired":
    case "card_suspended":
      return "scan-safety-strip--warn";
    case "qr_replaced":
    case "unknown_profile":
    case "unknown_qr":
      return "scan-safety-strip--neutral";
    default:
      return "scan-safety-strip--neutral";
  }
}

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 */
export function scanTruthKindsMatch(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

/**
 * @param {string} profileId
 * @param {string} qrId
 */
export function scanTruthReloadSessionKey(profileId, qrId) {
  return `${SCAN_TRUTH_RELOAD_SESSION_PREFIX}${profileId}:${qrId}`;
}

/**
 * Navigation types that must not trust SSR fast-path (PerformanceNavigationTiming).
 * @param {string | null | undefined} navigationType
 */
export function shouldForceScanTruthRevalidation(navigationType) {
  return navigationType === "back_forward" || navigationType === "prerender";
}

/**
 * @param {{
 *   persisted?: boolean,
 *   navigationType?: string | null,
 * }} input
 */
export function shouldBypassSsrFastPath(input = {}) {
  if (input.persisted) return true;
  if (shouldForceScanTruthRevalidation(input.navigationType)) return true;
  return false;
}

/**
 * @param {boolean} reloadAlreadyAttempted
 */
export function scanTruthMismatchAction(reloadAlreadyAttempted) {
  return reloadAlreadyAttempted ? "apply_network" : "reload";
}

/**
 * Append cache-bust query for a hard navigation after SSR/network kind mismatch.
 * @param {string} href
 * @param {number} [nowMs]
 */
export function scanTruthCacheBustUrl(href, nowMs = Date.now()) {
  const url = new URL(href, "https://humanity.llc");
  url.searchParams.set(SCAN_TRUTH_CACHE_BUST_PARAM, String(nowMs));
  return url.toString();
}

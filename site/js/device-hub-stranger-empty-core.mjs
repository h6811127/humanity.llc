/**
 * Stranger-empty hub: hide steward chrome until first save or inbox action.
 * @see docs/HUB_STRANGER_ONBOARDING.md
 */

export const HUB_STRANGER_EMPTY_CLASS = "device-hub--stranger-empty";

/** Import/restore group stays visible in stranger-empty hub (Phase 4). */
export const HUB_RESTORE_ALWAYS_ATTR = "data-hub-restore-always";

export const LANDING_STRANGER_CHROME_CLASS = "landing-stranger-chrome";

/**
 * @param {{
 *   walletCount?: number,
 *   pinCount?: number,
 *   inboxActionCount?: number,
 *   walletCorrupt?: boolean,
 * }} input
 */
export function isHubStrangerEmptyState(input) {
  if (input.walletCorrupt === true) return false;
  const walletCount = input.walletCount ?? 0;
  const pinCount = input.pinCount ?? 0;
  const inboxActionCount = input.inboxActionCount ?? 0;
  if (walletCount > 0 || pinCount > 0) return false;
  if (inboxActionCount > 0) return false;
  return true;
}

/**
 * @param {string} [pathname]
 */
export function isLandingHomePath(pathname) {
  const path = pathname || (typeof location !== "undefined" ? location.pathname : "");
  return path === "/" || path === "/index.html";
}

/**
 * @param {{
 *   pathname?: string,
 *   walletCount?: number,
 *   pinCount?: number,
 *   inboxActionCount?: number,
 * }} input
 */
export function isLandingStrangerChrome(input) {
  if (!isLandingHomePath(input.pathname)) return false;
  return isHubStrangerEmptyState(input);
}

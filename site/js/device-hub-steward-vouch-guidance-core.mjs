/**
 * Hub steward vouch product guidance (S4 · iPhone camera vs PWA).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S4
 */

/**
 * @param {{
 *   isIosWebKit: boolean;
 *   standalone: boolean;
 *   walletCount?: number;
 * }} input
 */
export function shouldShowHubStewardVouchGuidance(input) {
  const walletCount = input.walletCount ?? 0;
  return Boolean(input.isIosWebKit && walletCount >= 1);
}

/**
 * @param {{
 *   standalone: boolean;
 * }} input
 */
export function hubStewardVouchGuidanceVariant(input) {
  return input.standalone ? "pwa" : "safari";
}

/** Copy for Flow 2 F2-2 offline disclosure on public scan HTML. */
export const SCAN_OFFLINE_BANNER_TEXT =
  "Offline - status may be stale; refresh when connected.";

/**
 * @param {boolean | undefined} isOnline `navigator.onLine`
 */
export function shouldShowScanOfflineBanner(isOnline: boolean | undefined): boolean {
  return isOnline === false;
}

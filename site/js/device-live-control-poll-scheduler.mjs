/**
 * Pure scheduling rules for live-control inbox polling (request budget Phase 1).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

export const LIVE_CONTROL_POLL_MS_ACTIVE = 5000;
export const LIVE_CONTROL_POLL_MS_IDLE = 30_000;

/**
 * @param {number} pendingCount
 */
export function liveControlPollIntervalMs(pendingCount) {
  return pendingCount > 0 ? LIVE_CONTROL_POLL_MS_ACTIVE : LIVE_CONTROL_POLL_MS_IDLE;
}

/**
 * Whether the client should run the live-control poll loop at all.
 *
 * @param {{
 *   hubExpanded: boolean,
 *   inboxSheetOpen: boolean,
 *   walletPage: boolean,
 * }} scope
 */
export function liveControlPollingShouldRun(scope) {
  if (scope.inboxSheetOpen) return true;
  if (scope.walletPage) return true;
  return scope.hubExpanded;
}

/**
 * @param {{
 *   documentVisible: boolean,
 *   backoffUntil: number,
 *   now?: number,
 * }} input
 */
export function liveControlPollTickShouldFetch(input) {
  const now = input.now ?? Date.now();
  if (!input.documentVisible) return false;
  if (now < input.backoffUntil) return false;
  return true;
}

/**
 * Resolve hub-expanded from DOM (sheet hub only).
 * @param {HTMLElement | null} hubEl `#device-hub` when present
 */
export function isDeviceHubExpanded(hubEl) {
  if (!hubEl) return false;
  return !hubEl.classList.contains("device-hub-collapsed");
}

/**
 * @param {{
 *   hubEl?: HTMLElement | null,
 *   inboxSheetOpen?: boolean,
 *   walletPage?: boolean,
 * }} input
 */
export function resolveLiveControlPollScope(input) {
  return liveControlPollingShouldRun({
    hubExpanded: isDeviceHubExpanded(input.hubEl ?? null),
    inboxSheetOpen: input.inboxSheetOpen === true,
    walletPage: input.walletPage === true,
  });
}

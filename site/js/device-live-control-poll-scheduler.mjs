/**
 * Pure scheduling rules for live-control inbox polling (request budget Phases 1–3).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

export const LIVE_CONTROL_POLL_MS_ACTIVE = 5000;
export const LIVE_CONTROL_POLL_MS_IDLE = 30_000;

/** Minimum gap between wallet network refreshes on tab visibility (Phase 2). */
export const WALLET_NETWORK_VISIBILITY_REFRESH_MS = 60_000;

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
 * Phase 3: do not poll live-control while resolver health is degraded/offline.
 *
 * @param {'ok' | 'degraded' | 'offline'} resolverHealth
 */
export function liveControlPollAllowedByResolverHealth(resolverHealth) {
  return resolverHealth === "ok";
}

/**
 * @param {{
 *   scopeActive: boolean,
 *   resolverHealth: 'ok' | 'degraded' | 'offline',
 * }} input
 */
export function liveControlPollLoopShouldRun(input) {
  return (
    input.scopeActive &&
    liveControlPollAllowedByResolverHealth(input.resolverHealth)
  );
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

/**
 * @param {number} cursor
 * @param {number} length pollable wallet rows
 */
export function pickRoundRobinPollIndex(cursor, length) {
  if (length <= 0) return -1;
  return cursor % length;
}

/**
 * @param {number} cursor index used on the last tick
 * @param {number} length pollable wallet rows
 */
export function nextRoundRobinIndex(cursor, length) {
  if (length <= 0) return 0;
  return (cursor + 1) % length;
}

/**
 * @param {number} lastFetchAt epoch ms; 0 = never
 * @param {number} [now]
 * @param {number} [minMs]
 */
export function walletNetworkVisibilityRefreshAllowed(
  lastFetchAt,
  now = Date.now(),
  minMs = WALLET_NETWORK_VISIBILITY_REFRESH_MS
) {
  if (!lastFetchAt || lastFetchAt <= 0) return true;
  return now - lastFetchAt >= minMs;
}

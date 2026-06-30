/**
 * Pure scheduling rules for live-control inbox polling (request budget Phases 1–3).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

export const LIVE_CONTROL_POLL_MS_ACTIVE = 5000;
export const LIVE_CONTROL_POLL_MS_IDLE = 60_000;

/** Hidden tab + background alerts: full-wallet probe interval (no Watch). */
export const LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS = LIVE_CONTROL_POLL_MS_IDLE;

/** Minimum gap between wallet network refreshes on tab visibility (Phase 2). */
export const WALLET_NETWORK_VISIBILITY_REFRESH_MS = 60_000;

/**
 * @param {number} pendingCount
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function liveControlPollIntervalMs(pendingCount, policy) {
  const active = policy?.pollLiveProofActiveMs ?? LIVE_CONTROL_POLL_MS_ACTIVE;
  const idle = policy?.pollLiveProofIdleMs ?? LIVE_CONTROL_POLL_MS_IDLE;
  return pendingCount > 0 ? active : idle;
}

/**
 * Whether the client should run the live-control poll loop at all.
 *
 * @param {{
 *   hubExpanded: boolean,
 *   inboxSheetOpen: boolean,
 *   walletPage: boolean,
 *   watchEnabled?: boolean,
 *   stewardShellPage?: boolean,
 * }} scope
 */
export function liveControlPollingShouldRun(scope) {
  if (scope.inboxSheetOpen) return true;
  if (scope.hubExpanded) return true;
  if (scope.watchEnabled && scope.stewardShellPage) return true;
  if (scope.walletPage && scope.watchEnabled) return true;
  return false;
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
 * Hidden-tab background alerts: probe server while app is backgrounded (alerts on, not Watch).
 *
 * @param {{
 *   alertsEnabled: boolean,
 *   permissionGranted: boolean,
 *   tabHidden: boolean,
 *   resolverHealth: 'ok' | 'degraded' | 'offline',
 *   backoffUntil?: number,
 *   stewardPushHealthy?: boolean,
 *   now?: number,
 * }} input
 */
export function liveControlBackgroundAlertPollShouldRun(input) {
  if (!input.alertsEnabled || !input.permissionGranted) return false;
  if (!input.tabHidden) return false;
  if (input.stewardPushHealthy === true) return false;
  const now = input.now ?? Date.now();
  if (now < (input.backoffUntil ?? 0)) return false;
  return liveControlPollAllowedByResolverHealth(input.resolverHealth);
}

/**
 * Browser alerts on + lost-item relays in wallet: poll for finder messages (visible or hidden tab).
 *
 * @param {{
 *   alertsEnabled: boolean,
 *   permissionGranted: boolean,
 *   relayEligible: boolean,
 *   resolverHealth: 'ok' | 'degraded' | 'offline',
 *   backoffUntil?: number,
 *   now?: number,
 * }} input
 */
export function relayOfferAlertPollShouldRun(input) {
  if (!input.alertsEnabled) return false;
  if (!input.relayEligible) return false;
  const now = input.now ?? Date.now();
  if (now < (input.backoffUntil ?? 0)) return false;
  return liveControlManualPollAllowedByResolverHealth(input.resolverHealth);
}

/**
 * @param {number} relayPendingCount
 */
export function relayOfferAlertPollIntervalMs(relayPendingCount) {
  return relayPendingCount > 0 ? LIVE_CONTROL_POLL_MS_ACTIVE : LIVE_CONTROL_BACKGROUND_ALERT_POLL_MS;
}

/**
 * Browser alerts on, tab visible, Watch off: poll live proof for foreground strip (P1-MOTO-21).
 *
 * @param {{
 *   alertsEnabled: boolean,
 *   permissionGranted: boolean,
 *   tabVisible: boolean,
 *   watchEnabled: boolean,
 *   hasPollableCards: boolean,
 *   resolverHealth: 'ok' | 'degraded' | 'offline',
 *   stewardPushHealthy?: boolean,
 *   backoffUntil?: number,
 *   now?: number,
 * }} input
 */
export function liveProofForegroundAlertPollShouldRun(input) {
  if (!input.alertsEnabled) return false;
  if (!input.tabVisible) return false;
  if (input.watchEnabled) return false;
  if (!input.hasPollableCards) return false;
  if (input.stewardPushHealthy === true) return false;
  const now = input.now ?? Date.now();
  if (now < (input.backoffUntil ?? 0)) return false;
  return liveControlManualPollAllowedByResolverHealth(input.resolverHealth);
}

/**
 * Phase 3: do not poll live-control while resolver health is degraded/offline.
 *
 * @param {'ok' | 'degraded' | 'offline' | 'unset'} resolverHealth
 */
export function liveControlPollAllowedByResolverHealth(resolverHealth) {
  return resolverHealth === "ok";
}

/**
 * Manual / browser-alert polls may run before resolver health settles (P1-MOTO-06 / MOTO-21).
 *
 * @param {'ok' | 'degraded' | 'offline' | 'unset'} resolverHealth
 */
export function liveControlManualPollAllowedByResolverHealth(resolverHealth) {
  return resolverHealth === "ok" || resolverHealth === "unset";
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
 * Phase 5: automatic poll timer runs only when watch is on and loop would run.
 *
 * @param {{
 *   watchEnabled: boolean,
 *   scopeActive: boolean,
 *   resolverHealth: 'ok' | 'degraded' | 'offline',
 *   stewardPushHealthy?: boolean,
 * }} input
 */
export function liveControlAutoPollShouldRun(input) {
  if (input.stewardPushHealthy === true) return false;
  if (input.budgetExhausted === true) return false;
  if (input.isPollLeader === false) return false;
  return (
    input.watchEnabled &&
    liveControlPollLoopShouldRun({
      scopeActive: input.scopeActive,
      resolverHealth: input.resolverHealth,
    })
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
 *   watchEnabled?: boolean,
 *   stewardShellPage?: boolean,
 * }} input
 */
export function resolveLiveControlPollScope(input) {
  return liveControlPollingShouldRun({
    hubExpanded: isDeviceHubExpanded(input.hubEl ?? null),
    inboxSheetOpen: input.inboxSheetOpen === true,
    walletPage: input.walletPage === true,
    watchEnabled: input.watchEnabled === true,
    stewardShellPage: input.stewardShellPage === true,
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

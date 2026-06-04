/**
 * Pure since-visit alert gating (resolver health + wallet poll readiness).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-11
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md § G5
 */

/** @typedef {'unset' | 'ok' | 'degraded' | 'offline'} ResolverHealthForSinceVisit */

export const RESOLVER_HEALTH_UNSET = "unset";

/**
 * @param {'ok' | 'degraded' | 'offline' | 'unset' | string | null | undefined} status
 * @returns {ResolverHealthForSinceVisit}
 */
export function normalizeResolverHealthForSinceVisit(status) {
  if (status === "ok" || status === "degraded" || status === "offline") return status;
  return RESOLVER_HEALTH_UNSET;
}

/**
 * Per-card wallet status GETs may run when health is ok or not yet settled this visit.
 * (Live-proof polls use {@link liveControlPollAllowedByResolverHealth} — stricter.)
 *
 * @param {ResolverHealthForSinceVisit} resolverHealth
 */
export function walletNetworkFetchAllowedByResolverHealth(resolverHealth) {
  return resolverHealth === "ok" || resolverHealth === RESOLVER_HEALTH_UNSET;
}

/**
 * True when hub/inbox/dot since-visit surfaces must stay hidden.
 *
 * @param {{
 *   resolverHealth?: ResolverHealthForSinceVisit,
 *   walletStatusPollHealth?: 'ok' | 'degraded' | 'offline',
 *   liveProofPollHealth?: 'ok' | 'degraded' | 'offline',
 *   hasWalletNetworkPoll?: boolean,
 *   shellBootReady?: boolean,
 * }} input
 */
export function shouldSuppressCardDisabledSinceVisitAlertsCore(input = {}) {
  const resolverHealth = input.resolverHealth ?? RESOLVER_HEALTH_UNSET;
  const walletStatusPollHealth = input.walletStatusPollHealth ?? "ok";
  const liveProofPollHealth = input.liveProofPollHealth ?? "ok";
  const hasWalletNetworkPoll = input.hasWalletNetworkPoll === true;
  const shellBootReady = input.shellBootReady !== false;

  if (!shellBootReady) return true;
  if (resolverHealth === RESOLVER_HEALTH_UNSET) return true;
  if (resolverHealth === "degraded" || resolverHealth === "offline") return true;
  if (walletStatusPollHealth === "degraded" || walletStatusPollHealth === "offline") {
    return true;
  }
  if (liveProofPollHealth === "degraded" || liveProofPollHealth === "offline") {
    return true;
  }
  // RC-11 / G5: health may flip to ok before the first wallet poll this visit.
  if (!hasWalletNetworkPoll) return true;
  return false;
}

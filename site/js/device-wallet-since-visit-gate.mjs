/**
 * Suppress card-disabled-since-visit UI when resolver polls are not trustworthy.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md
 */
import { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs?v=94";
import { isDeviceBootReadyState } from "./device-shell-boot-core.mjs";
import { hasWalletNetworkTruthPoll } from "./device-wallet-network-truth.mjs?v=94";
import {
  normalizeResolverHealthForSinceVisit,
  RESOLVER_HEALTH_UNSET,
  shouldSuppressCardDisabledSinceVisitAlertsCore,
} from "./device-wallet-since-visit-gate-core.mjs";

/** @type {'unset' | 'ok' | 'degraded' | 'offline'} */
let resolverHealthStatus = RESOLVER_HEALTH_UNSET;

/** @type {'ok' | 'degraded' | 'offline'} */
let walletStatusPollHealth = "ok";

/** @returns {'unset' | 'ok' | 'degraded' | 'offline'} */
export function getResolverHealthStatus() {
  return resolverHealthStatus;
}

/** @returns {'ok' | 'degraded' | 'offline'} */
export function getWalletStatusPollHealth() {
  return walletStatusPollHealth;
}

/** @param {'ok' | 'degraded' | 'offline'} status */
export function setResolverHealthStatusForSinceVisit(status) {
  resolverHealthStatus = normalizeResolverHealthForSinceVisit(status);
}

/** @param {'ok' | 'degraded' | 'offline'} status G4: per-card status polls untrustworthy (e.g. 429). */
export function setWalletStatusPollHealthForSinceVisit(status) {
  walletStatusPollHealth =
    status === "ok" || status === "degraded" || status === "offline" ? status : "offline";
}

/** @internal Vitest only */
export function resetSinceVisitGateForTests() {
  resetSinceVisitGateOnShellResume();
}

/** bfcache resume — drop poll authority until health + wallet polls re-run. */
export function resetSinceVisitGateOnShellResume() {
  resolverHealthStatus = RESOLVER_HEALTH_UNSET;
  walletStatusPollHealth = "ok";
}

function readShellBootReadyForSinceVisit() {
  if (typeof document === "undefined") return true;
  const boot = document.body?.dataset?.boot;
  if (!boot) return false;
  return isDeviceBootReadyState(boot);
}

/** True when since-visit banners, inbox rows, and dot overlay must stay hidden. */
export function shouldSuppressCardDisabledSinceVisitAlerts() {
  return shouldSuppressCardDisabledSinceVisitAlertsCore({
    resolverHealth: resolverHealthStatus,
    walletStatusPollHealth,
    liveProofPollHealth: getLiveControlPollHealth(),
    hasWalletNetworkPoll: hasWalletNetworkTruthPoll(),
    shellBootReady: readShellBootReadyForSinceVisit(),
  });
}

export {
  normalizeResolverHealthForSinceVisit,
  RESOLVER_HEALTH_UNSET,
  shouldSuppressCardDisabledSinceVisitAlertsCore,
  walletNetworkFetchAllowedByResolverHealth,
} from "./device-wallet-since-visit-gate-core.mjs";

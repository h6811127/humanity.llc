/**
 * Suppress card-disabled-since-visit UI when resolver polls are not trustworthy.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md
 */
import { getLiveControlPollHealth } from "./device-live-control-inbox-core.mjs";

/** @type {'ok' | 'degraded' | 'offline'} */
let resolverHealthStatus = "offline";

/** @type {'ok' | 'degraded' | 'offline'} */
let walletStatusPollHealth = "ok";

/** @returns {'ok' | 'degraded' | 'offline'} */
export function getResolverHealthStatus() {
  return resolverHealthStatus;
}

/** @returns {'ok' | 'degraded' | 'offline'} */
export function getWalletStatusPollHealth() {
  return walletStatusPollHealth;
}

/** @param {'ok' | 'degraded' | 'offline'} status */
export function setResolverHealthStatusForSinceVisit(status) {
  resolverHealthStatus = status === "ok" || status === "degraded" || status === "offline" ? status : "offline";
}

/** @param {'ok' | 'degraded' | 'offline'} status G4: per-card status polls untrustworthy (e.g. 429). */
export function setWalletStatusPollHealthForSinceVisit(status) {
  walletStatusPollHealth =
    status === "ok" || status === "degraded" || status === "offline" ? status : "offline";
}

/** True when since-visit banners, inbox rows, and dot overlay must stay hidden. */
export function shouldSuppressCardDisabledSinceVisitAlerts() {
  if (resolverHealthStatus === "degraded" || resolverHealthStatus === "offline") {
    return true;
  }
  if (walletStatusPollHealth === "degraded" || walletStatusPollHealth === "offline") {
    return true;
  }
  const liveProofHealth = getLiveControlPollHealth();
  return liveProofHealth === "degraded" || liveProofHealth === "offline";
}

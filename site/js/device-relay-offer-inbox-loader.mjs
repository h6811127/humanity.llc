/**
 * Lazy loader for relay-offer inbox — keeps device-status / hub-ui graph loadable
 * when relay-offer client or resolver endpoints are mid-deploy.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

export const RELAY_OFFER_INBOX_CHANGED = "hc-relay-offer-inbox-changed";

export {
  relayOfferInboxAggregateTitle,
  relayOfferInboxRowSubtitle,
} from "./device-relay-offer-inbox-core.mjs";

/** @type {Promise<typeof import("./device-relay-offer-inbox.mjs")> | null} */
let relayOfferModulePromise = null;

/** @type {typeof import("./device-relay-offer-inbox.mjs") | null} */
let relayOfferModule = null;

export function loadRelayOfferInboxModule() {
  if (!relayOfferModulePromise) {
    relayOfferModulePromise = import(
      `./device-relay-offer-inbox.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`
    ).then((mod) => {
      relayOfferModule = mod;
      return mod;
    });
  }
  return relayOfferModulePromise;
}

/** @returns {import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[]} */
export function getRelayOfferPending() {
  if (relayOfferModule) return relayOfferModule.getRelayOfferPending();
  return [];
}

export function getRelayOfferPendingCount() {
  if (relayOfferModule) return relayOfferModule.getRelayOfferPendingCount();
  return 0;
}

export function relayOfferInboxEligible() {
  if (relayOfferModule) return relayOfferModule.relayOfferInboxEligible();
  return false;
}

export function walletHasActiveLostItemRelays() {
  if (relayOfferModule) return relayOfferModule.walletHasActiveLostItemRelays();
  return false;
}

export function refreshRelayOfferInbox() {
  if (relayOfferModule) {
    return relayOfferModule.refreshRelayOfferInbox();
  }
  return void loadRelayOfferInboxModule().then((mod) => mod.refreshRelayOfferInbox());
}

export function probeRelayOfferInboxForBackgroundAlerts() {
  if (relayOfferModule) {
    return relayOfferModule.probeRelayOfferInboxForBackgroundAlerts();
  }
  return loadRelayOfferInboxModule().then((mod) => mod.probeRelayOfferInboxForBackgroundAlerts());
}

export function checkRelayOffersNow() {
  if (relayOfferModule) {
    return relayOfferModule.checkRelayOffersNow();
  }
  return void loadRelayOfferInboxModule().then((mod) => mod.checkRelayOffersNow());
}

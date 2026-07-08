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

const WALLET_STORAGE_KEY = "hc_wallet";
const CHILD_OBJECTS_STORAGE_KEY = "hc_child_objects_v1";
const CHILD_OBJECT_TYPE_LOST_ITEM_RELAY = "lost_item_relay";
const CHILD_OBJECT_STATUS_DISABLED = "disabled";

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
  return walletHasActiveLostItemRelays();
}

/**
 * This loader sits on the shell graph, so keep the pre-load eligibility check
 * dependency-free and mirror only the storage fields needed to decide whether
 * the heavier relay inbox module should be loaded.
 * @param {string} profileId
 */
function hasLocalActiveLostItemRelays(profileId) {
  if (!profileId) return false;
  try {
    const raw = localStorage.getItem(`${CHILD_OBJECTS_STORAGE_KEY}:${profileId}`);
    if (!raw) return false;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return false;
    return rows.some((row) => {
      if (!row || typeof row !== "object") return false;
      const r = /** @type {Record<string, unknown>} */ (row);
      return (
        r.object_type === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY &&
        r.status !== CHILD_OBJECT_STATUS_DISABLED
      );
    });
  } catch {
    return false;
  }
}

export function walletHasActiveLostItemRelays() {
  if (relayOfferModule) return relayOfferModule.walletHasActiveLostItemRelays();
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return false;
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return false;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const pid = /** @type {Record<string, unknown>} */ (entry).profile_id;
      if (typeof pid === "string" && hasLocalActiveLostItemRelays(pid)) return true;
    }
  } catch {
    return false;
  }
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

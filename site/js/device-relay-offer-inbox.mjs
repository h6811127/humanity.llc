/**
 * Relay-offer inbox refresh — hub open, manual check, dismiss, and browser-alert poll.
 * @see docs/DEVICE_INBOX.md
 */
import { readChildObjectRows } from "./child-object-store-core.mjs";
import { isActiveLostItemRelayRow } from "./created-child-object-core.mjs";
import { getTabSession } from "./device-keys.mjs";
import { signingKeysForProfile } from "./device-signing-keys-for-profile.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  parseRelayOfferProfileSummaryBody,
  relayOfferInboxChanged,
} from "./device-relay-offer-inbox-core.mjs";
import { fetchRelayOfferProfileSummary } from "./lost-item-offer-owner.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs?v=94";

export {
  relayOfferInboxAggregateTitle,
  relayOfferInboxRowSubtitle,
} from "./device-relay-offer-inbox-core.mjs";

export const RELAY_OFFER_INBOX_CHANGED = "hc-relay-offer-inbox-changed";

/** Coalesce automatic refreshes (intent-based, not live-proof watch). */
const AUTO_REFRESH_COALESCE_MS = 15 * 60 * 1000;

/** @type {import("./device-relay-offer-inbox-core.mjs").RelayOfferPendingItem[]} */
let pending = [];
let lastRefreshAt = 0;
let refreshInFlight = null;

/**
 * @returns {{ profileId: string; privateKeyBase58: string; publicKeyBase58: string } | null}
 */
export function signingKeysFromTabSession() {
  const session = getTabSession();
  if (!session?.profile_id) return null;
  if (session.owner_private_key_b58 && session.owner_public_key_b58) {
    return {
      profileId: session.profile_id,
      privateKeyBase58: session.owner_private_key_b58,
      publicKeyBase58: session.owner_public_key_b58,
    };
  }
  if (session.recovery_private_key_b58 && session.recovery_public_key_b58) {
    return {
      profileId: session.profile_id,
      privateKeyBase58: session.recovery_private_key_b58,
      publicKeyBase58: session.recovery_public_key_b58,
    };
  }
  return null;
}

/**
 * @param {string} profileId
 */
function hasLocalActiveLostItemRelays(profileId) {
  try {
    return readChildObjectRows(localStorage, profileId).some(isActiveLostItemRelayRow);
  } catch {
    return false;
  }
}

export function relayOfferInboxEligible() {
  const keys = signingKeysFromTabSession();
  if (keys && hasLocalActiveLostItemRelays(keys.profileId)) return true;
  return walletHasActiveLostItemRelays();
}

/** True when any saved wallet row has active lost-item relay child objects. */
export function walletHasActiveLostItemRelays() {
  try {
    for (const entry of loadWallet()) {
      const pid = typeof entry.profile_id === "string" ? entry.profile_id : "";
      if (pid && hasLocalActiveLostItemRelays(pid)) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function getRelayOfferPending() {
  return [...pending];
}

export function getRelayOfferPendingCount() {
  return pending.reduce((sum, item) => sum + item.pendingCount, 0);
}

/**
 * @param {{ manual?: boolean, promptUnlock?: boolean }} [opts]
 */
export async function refreshRelayOfferInbox(opts = {}) {
  const manual = opts.manual === true;
  const promptUnlock = opts.promptUnlock ?? manual;
  const now = Date.now();

  if (!manual) {
    if (getResolverHealthStatus() !== "ok") return pending;
    if (!relayOfferInboxEligible()) {
      if (pending.length > 0) {
        pending = [];
        window.dispatchEvent(new Event(RELAY_OFFER_INBOX_CHANGED));
      }
      return pending;
    }
    if (now - lastRefreshAt < AUTO_REFRESH_COALESCE_MS) return pending;
  }

  let keys = signingKeysFromTabSession();
  if (!keys) {
    for (const entry of loadWallet()) {
      const pid = typeof entry.profile_id === "string" ? entry.profile_id : "";
      if (!pid || !hasLocalActiveLostItemRelays(pid)) continue;
      keys = await signingKeysForProfile(pid, { promptUnlock });
      if (keys) break;
    }
  }
  if (!keys || !hasLocalActiveLostItemRelays(keys.profileId)) {
    const changed = relayOfferInboxChanged(pending, []);
    pending = [];
    lastRefreshAt = now;
    if (changed) window.dispatchEvent(new Event(RELAY_OFFER_INBOX_CHANGED));
    return pending;
  }

  if (refreshInFlight) {
    await refreshInFlight;
    return pending;
  }

  refreshInFlight = (async () => {
    try {
      const body = await fetchRelayOfferProfileSummary({
        profileId: keys.profileId,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      const parsed = parseRelayOfferProfileSummaryBody(body, keys.profileId);
      const next = parsed?.items ?? [];
      const changed = relayOfferInboxChanged(pending, next);
      pending = next;
      lastRefreshAt = Date.now();
      if (changed) window.dispatchEvent(new Event(RELAY_OFFER_INBOX_CHANGED));
    } catch {
      /* keep last snapshot on transient errors */
    } finally {
      refreshInFlight = null;
    }
  })();

  await refreshInFlight;
  return pending;
}

/** Manual hub / shortcuts refresh. */
export function checkRelayOffersNow() {
  return refreshRelayOfferInbox({ manual: true });
}

/**
 * Browser-alert probe: bypass coalesce, no unlock prompt (device_unlock cards skip until unlocked).
 */
export async function probeRelayOfferInboxForBackgroundAlerts() {
  return refreshRelayOfferInbox({ manual: true, promptUnlock: false });
}

/** Invalidate coalesce window (tests). */
export function resetRelayOfferInboxState() {
  pending = [];
  lastRefreshAt = 0;
  refreshInFlight = null;
}

/**
 * Shared navigation for hub / glance device notices.
 */
import { getTabSession, openCardNowPage } from "./device-keys.mjs";
import { requestFocusTab } from "./device-tab-presence.mjs";
import { loadWallet } from "./device-wallet.mjs";

/**
 * @param {{ profile_id?: string, qr_id?: string | null }} [session]
 */
export function createdUrlForSession(session) {
  const url = new URL("/created/", location.origin);
  if (session?.profile_id) url.searchParams.set("profile_id", session.profile_id);
  if (session?.qr_id) url.searchParams.set("qr_id", session.qr_id);
  return url;
}

/** Navigate to /created/ for unsaved keys in this tab. */
export function openSaveKeysForThisTab() {
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
  location.href = createdUrlForSession(getTabSession()).href;
}

/**
 * @param {string} profileId
 * @param {string | null | undefined} [qrId]
 */
export function openCreatedForProfile(profileId, qrId) {
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
  location.href = createdUrlForSession({ profile_id: profileId, qr_id: qrId ?? null }).href;
}

/**
 * @param {string} profileId
 */
export function walletEntryForProfile(profileId) {
  return loadWallet().find((e) => e.profile_id === profileId) ?? null;
}

/**
 * Open keys for another tab: Use keys from wallet, try tab focus, then /created/.
 * @param {{ tabId: string, profile_id: string, qr_id?: string | null }} entry
 * @returns {boolean} false when notice should be dismissed (same tab already has keys)
 */
export function actOnOtherTabKeys(entry) {
  const session = getTabSession();
  if (
    session?.profile_id === entry.profile_id &&
    session?.owner_private_key_b58
  ) {
    return false;
  }

  const walletEntry = walletEntryForProfile(entry.profile_id);
  const thisHasKeys = !!(session?.owner_private_key_b58);
  if (walletEntry && !thisHasKeys) {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    window.dispatchEvent(new CustomEvent("hc-glance-popover-close"));
    openCardNowPage(walletEntry);
    return true;
  }

  requestFocusTab(entry.tabId);
  openCreatedForProfile(entry.profile_id, entry.qr_id);
  return true;
}

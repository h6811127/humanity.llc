/**
 * Actions for orphan tab keys (profile removed from hc_wallet).
 */
import { clearTabSessionKeys } from "./device-keys.mjs";
import { orphanKeysClearConfirmMessage } from "./device-orphan-keys-nav-core.mjs";
import { inboxCrossTabLabel } from "./device-inbox-core.mjs";
import { resetPresenceInboxGatherCache } from "./device-inbox.mjs";
import {
  broadcastClearProfileKeys,
  purgePresenceForProfile,
  requestFocusTab,
} from "./device-tab-presence.mjs";

/**
 * @param {{ tabId: string, profile_id: string, label?: string, handle?: string }} entry
 */
export function actOnOrphanRemovedTabKeys(entry) {
  if (!entry?.tabId) return false;
  requestFocusTab(entry.tabId);
  return true;
}

/**
 * @param {{ profile_id: string, label?: string, handle?: string }} entry
 * @returns {boolean} true when keys were cleared
 */
export function clearOrphanKeysOnDevice(entry) {
  if (!entry?.profile_id) return false;
  const label = inboxCrossTabLabel(entry);
  if (!window.confirm(orphanKeysClearConfirmMessage(label))) {
    return false;
  }
  broadcastClearProfileKeys(entry.profile_id);
  const session = clearTabSessionKeysIfProfile(entry.profile_id);
  purgePresenceForProfile(entry.profile_id);
  resetPresenceInboxGatherCache();
  if (session) {
    window.dispatchEvent(new Event("hc-device-hub-changed"));
  }
  return true;
}

/**
 * @param {string} profileId
 * @returns {boolean} true when this tab had matching session keys
 */
function clearTabSessionKeysIfProfile(profileId) {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (session?.profile_id !== profileId) return false;
    clearTabSessionKeys();
    return true;
  } catch {
    return false;
  }
}

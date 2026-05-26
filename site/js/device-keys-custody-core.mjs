/** @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md — signing key custody notices */

export const KEYS_CUSTODY_DISMISS_STORAGE_KEY = "hc_keys_custody_notice_dismissed";

/** @param {string} [storageKey] */
export function isKeysCustodyNoticeDismissed(storageKey = KEYS_CUSTODY_DISMISS_STORAGE_KEY) {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return true;
  }
}

/** @param {string} [storageKey] */
export function dismissKeysCustodyNotice(storageKey = KEYS_CUSTODY_DISMISS_STORAGE_KEY) {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* ignore */
  }
}

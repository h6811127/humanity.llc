/**
 * sessionStorage cache for device_unlock window (tab-scoped).
 */

import {
  deviceUnlockWindowExpiresAt,
  parseDeviceUnlockWindowCache,
} from "./device-custody-unlock-window-core.mjs";

export const DEVICE_UNLOCK_WINDOW_STORAGE_KEY = "hc_device_unlock_window";

/**
 * @param {number} [now]
 */
export function readDeviceUnlockWindowCache(now = Date.now()) {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DEVICE_UNLOCK_WINDOW_STORAGE_KEY);
    if (!raw) return null;
    return parseDeviceUnlockWindowCache(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

/**
 * @param {string} profileId
 * @param {string} ownerPrivateKeyB58
 */
export function writeDeviceUnlockWindowCache(profileId, ownerPrivateKeyB58) {
  if (typeof sessionStorage === "undefined") return;
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  const key =
    typeof ownerPrivateKeyB58 === "string" ? ownerPrivateKeyB58.trim() : "";
  if (!pid || !key) return;
  const payload = {
    profile_id: pid,
    owner_private_key_b58: key,
    granted_until: deviceUnlockWindowExpiresAt(),
  };
  sessionStorage.setItem(DEVICE_UNLOCK_WINDOW_STORAGE_KEY, JSON.stringify(payload));
}

export function clearDeviceUnlockWindowCache() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(DEVICE_UNLOCK_WINDOW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
export function trySessionFromDeviceUnlockWindow(entry) {
  const cache = readDeviceUnlockWindowCache();
  if (!cache) return null;
  const pid = typeof entry?.profile_id === "string" ? entry.profile_id.trim() : "";
  if (!pid || pid !== cache.profile_id) return null;
  return { ...entry, owner_private_key_b58: cache.owner_private_key_b58 };
}

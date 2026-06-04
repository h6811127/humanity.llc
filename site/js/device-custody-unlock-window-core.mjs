/**
 * device_unlock session window — avoid re-prompting WebAuthn within a tab session (WS-CUSTODY).
 * @see docs/CUSTODY_EASY_MODE.md § Unlock window
 */

/** Default 30 minutes (within spec 15–60 min band). */
export const DEVICE_UNLOCK_WINDOW_MS = 30 * 60 * 1000;

/**
 * @param {number | null | undefined} grantedUntil
 * @param {number} [now]
 */
export function isDeviceUnlockWindowValid(grantedUntil, now = Date.now()) {
  return typeof grantedUntil === "number" && Number.isFinite(grantedUntil) && grantedUntil > now;
}

/**
 * @param {number} [now]
 */
export function deviceUnlockWindowExpiresAt(now = Date.now()) {
  return now + DEVICE_UNLOCK_WINDOW_MS;
}

/**
 * @param {unknown} raw
 * @param {number} [now]
 * @returns {{
 *   profile_id: string;
 *   owner_private_key_b58: string;
 *   granted_until: number;
 * } | null}
 */
export function parseDeviceUnlockWindowCache(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const profile_id =
    typeof raw.profile_id === "string" ? raw.profile_id.trim() : "";
  const owner_private_key_b58 =
    typeof raw.owner_private_key_b58 === "string" ? raw.owner_private_key_b58.trim() : "";
  const granted_until =
    typeof raw.granted_until === "number" ? raw.granted_until : NaN;
  if (!profile_id || !owner_private_key_b58) return null;
  if (!isDeviceUnlockWindowValid(granted_until, now)) return null;
  return { profile_id, owner_private_key_b58, granted_until };
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 * @param {{ profile_id: string; owner_private_key_b58: string; granted_until: number } | null} cache
 */
export function deviceUnlockWindowMatchesEntry(entry, cache) {
  if (!cache || !entry || typeof entry !== "object") return false;
  const pid = typeof entry.profile_id === "string" ? entry.profile_id.trim() : "";
  return pid.length > 0 && pid === cache.profile_id;
}

/**
 * Merge wallet entry with cached signing material for activation.
 * @param {Record<string, unknown>} entry
 * @param {{ owner_private_key_b58: string }} cache
 */
export function sessionFromDeviceUnlockWindow(entry, cache) {
  return {
    ...entry,
    owner_private_key_b58: cache.owner_private_key_b58,
  };
}

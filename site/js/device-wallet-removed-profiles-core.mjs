/**
 * Profiles removed from hc_wallet - suppress cross-tab inbox for orphan tab keys.
 * @see docs/CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md path B
 */

export const REMOVED_PROFILES_STORAGE_KEY = "hc_wallet_removed_profile_ids";
export const MAX_REMOVED_PROFILE_IDS = 64;

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeRemovedProfileIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const id of raw) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out.slice(0, MAX_REMOVED_PROFILE_IDS);
}

/**
 * @param {string[]} ids
 * @param {string} profileId
 */
export function addRemovedProfileId(ids, profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return normalizeRemovedProfileIds(ids);
  const base = normalizeRemovedProfileIds(ids).filter((id) => id !== pid);
  base.unshift(pid);
  return base.slice(0, MAX_REMOVED_PROFILE_IDS);
}

/**
 * Drop denylist entries that are saved on device again.
 * @param {string[]} removedIds
 * @param {Iterable<string>} savedProfileIds
 */
export function reconcileRemovedProfileIds(removedIds, savedProfileIds) {
  const saved = new Set(savedProfileIds);
  return normalizeRemovedProfileIds(removedIds).filter((id) => !saved.has(id));
}

/**
 * @param {string | null | undefined} profileId
 * @param {Set<string> | string[]} removedProfileIds
 */
export function isProfileRemovedFromDevice(profileId, removedProfileIds) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return false;
  if (removedProfileIds instanceof Set) return removedProfileIds.has(pid);
  return removedProfileIds.includes(pid);
}

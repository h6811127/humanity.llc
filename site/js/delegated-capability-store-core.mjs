/** Device cache for resolver delegated-capability list (Manage tab source of truth). */

const STORE_PREFIX = "hc_delegated_capabilities_v1:";

/**
 * @param {string} profileId
 */
export function delegatedCapabilityStoreKey(profileId) {
  return `${STORE_PREFIX}${profileId}`;
}

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 * @param {Array<Record<string, unknown>>} capabilities
 */
export function writeDelegatedCapabilitiesCache(storage, profileId, capabilities) {
  if (!profileId) return;
  storage.setItem(
    delegatedCapabilityStoreKey(profileId),
    JSON.stringify({ updated_at: new Date().toISOString(), capabilities })
  );
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 * @returns {Array<Record<string, unknown>>}
 */
export function readDelegatedCapabilitiesCache(storage, profileId) {
  if (!profileId) return [];
  try {
    const raw = storage.getItem(delegatedCapabilityStoreKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.capabilities) ? parsed.capabilities : [];
  } catch {
    return [];
  }
}

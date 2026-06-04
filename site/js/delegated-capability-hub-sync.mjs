/**
 * Prefetch delegated-capability list for hub child-row hints (step 17).
 */
import { fetchDelegatedCapabilityList } from "./delegated-capability-sign.mjs";
import {
  readDelegatedCapabilitiesCache,
  writeDelegatedCapabilitiesCache,
} from "./delegated-capability-store-core.mjs";

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 */
export async function syncDelegatedCapabilitiesCache(storage, profileId) {
  if (!profileId) return readDelegatedCapabilitiesCache(storage, profileId);
  try {
    const data = await fetchDelegatedCapabilityList(profileId);
    const capabilities = Array.isArray(data?.capabilities) ? data.capabilities : [];
    writeDelegatedCapabilitiesCache(storage, profileId, capabilities);
    return capabilities;
  } catch {
    return readDelegatedCapabilitiesCache(storage, profileId);
  }
}

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string[]} profileIds
 */
export async function syncDelegatedCapabilitiesForProfileIds(storage, profileIds) {
  const ids = [...new Set(profileIds.filter((id) => typeof id === "string" && id))];
  await Promise.all(ids.map((profileId) => syncDelegatedCapabilitiesCache(storage, profileId)));
}

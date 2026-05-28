import { fetchChildObjectList } from "./child-object-fetch-list.mjs";
import { childObjectScanUrl } from "./child-object-qr.mjs";
import {
  readChildObjectRows,
  rowsFromNetworkChildObjects,
  writeChildObjectRows,
} from "./child-object-store-core.mjs";

/**
 * Replace the device child-object index from resolver list truth.
 * On fetch failure, leaves the existing local index unchanged.
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 */
export async function reconcileChildObjectsFromNetwork(storage, profileId) {
  if (!profileId) return [];
  const data = await fetchChildObjectList(profileId);
  const networkObjects = Array.isArray(data?.objects) ? data.objects : [];
  const rows = rowsFromNetworkChildObjects(profileId, networkObjects, childObjectScanUrl);
  return writeChildObjectRows(storage, profileId, rows);
}

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 */
export async function refreshChildObjectsFromNetwork(storage, profileId) {
  try {
    return await reconcileChildObjectsFromNetwork(storage, profileId);
  } catch {
    return readChildObjectRows(storage, profileId);
  }
}

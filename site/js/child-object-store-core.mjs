/** Device-local index of child objects created under a root profile. */

import { dispatchCreatedTagsCollectionSync } from "./created-tags-collection-sync-core.mjs";

export const CHILD_OBJECTS_STORAGE_KEY = "hc_child_objects_v1";

/**
 * @param {string} profileId
 */
export function childObjectsBucketKey(profileId) {
  return `${CHILD_OBJECTS_STORAGE_KEY}:${profileId}`;
}

/**
 * @param {unknown} row
 */
export function isChildObjectRow(row) {
  if (!row || typeof row !== "object") return false;
  const r = /** @type {Record<string, unknown>} */ (row);
  if (
    typeof r.object_id !== "string" ||
    typeof r.object_type !== "string" ||
    typeof r.public_label !== "string" ||
    typeof r.public_state !== "string"
  ) {
    return false;
  }
  if (r.qr_id !== undefined && typeof r.qr_id !== "string") return false;
  if (r.scan_url !== undefined && typeof r.scan_url !== "string") return false;
  if (r.created_at !== undefined && typeof r.created_at !== "string") return false;
  if (r.status !== undefined && typeof r.status !== "string") return false;
  if (r.time_policy !== undefined && (typeof r.time_policy !== "object" || r.time_policy === null)) {
    return false;
  }
  if (r.custody !== undefined && (typeof r.custody !== "object" || r.custody === null)) {
    return false;
  }
  return true;
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 */
export function readChildObjectRows(storage, profileId) {
  if (!profileId) return [];
  try {
    const raw = storage.getItem(childObjectsBucketKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChildObjectRow);
  } catch {
    return [];
  }
}

/**
 * @param {unknown} entry
 */
function isNetworkChildObjectEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (entry);
  return (
    typeof row.object_id === "string" &&
    typeof row.object_type === "string" &&
    typeof row.public_label === "string" &&
    typeof row.public_state === "string"
  );
}

/**
 * Build device index rows from resolver list payload (network truth).
 * @param {string} profileId
 * @param {unknown[]} networkObjects
 * @param {(profileId: string, qrId: string) => string} buildScanUrl
 */
export function rowsFromNetworkChildObjects(profileId, networkObjects, buildScanUrl) {
  if (!Array.isArray(networkObjects)) return [];
  return networkObjects
    .filter(isNetworkChildObjectEntry)
    .map((entry) => {
      const row = /** @type {Record<string, unknown>} */ (entry);
      /** @type {Record<string, unknown>} */
      const out = {
        object_id: row.object_id,
        object_type: row.object_type,
        public_label: row.public_label,
        public_state: row.public_state,
      };
      if (typeof row.status === "string") out.status = row.status;
      if (typeof row.created_at === "string") out.created_at = row.created_at;
      if (row.time_policy && typeof row.time_policy === "object") {
        out.time_policy = row.time_policy;
      }
      if (row.custody && typeof row.custody === "object") {
        out.custody = row.custody;
      }
      const qrId =
        typeof row.active_qr_id === "string" && row.active_qr_id ? row.active_qr_id : null;
      if (qrId) {
        out.qr_id = qrId;
        out.scan_url = buildScanUrl(profileId, qrId);
      }
      return out;
    })
    .filter(isChildObjectRow);
}

/**
 * @param {Pick<Storage, "setItem">} storage
 * @param {string} profileId
 * @param {Array<Record<string, unknown>>} rows
 */
export function writeChildObjectRows(storage, profileId, rows) {
  const next = rows.filter(isChildObjectRow);
  storage.setItem(childObjectsBucketKey(profileId), JSON.stringify(next));
  dispatchCreatedTagsCollectionSync();
  return next;
}

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 * @param {Record<string, unknown>} row
 */
export function appendChildObjectRow(storage, profileId, row) {
  if (!isChildObjectRow(row)) {
    throw new Error("Invalid child object row.");
  }
  const rows = readChildObjectRows(storage, profileId).filter(
    (existing) => existing.object_id !== row.object_id
  );
  const next = [...rows, row];
  storage.setItem(childObjectsBucketKey(profileId), JSON.stringify(next));
  dispatchCreatedTagsCollectionSync();
  return next;
}

/**
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 * @param {string} profileId
 * @param {string} objectId
 * @param {Partial<Record<string, unknown>>} patch
 */
export function updateChildObjectRow(storage, profileId, objectId, patch) {
  const rows = readChildObjectRows(storage, profileId);
  const index = rows.findIndex((row) => row.object_id === objectId);
  if (index < 0) {
    throw new Error("Child object not found on this device.");
  }
  const updated = { ...rows[index] };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete updated[key];
    else updated[key] = value;
  }
  if (!isChildObjectRow(updated)) {
    throw new Error("Invalid child object row.");
  }
  const next = [...rows];
  next[index] = updated;
  storage.setItem(childObjectsBucketKey(profileId), JSON.stringify(next));
  dispatchCreatedTagsCollectionSync();
  return next;
}

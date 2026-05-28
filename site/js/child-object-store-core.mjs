/** Device-local index of child objects created under a root profile. */

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
  return (
    typeof r.object_id === "string" &&
    typeof r.object_type === "string" &&
    typeof r.public_label === "string" &&
    typeof r.public_state === "string"
  );
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
  const updated = { ...rows[index], ...patch };
  if (!isChildObjectRow(updated)) {
    throw new Error("Invalid child object row.");
  }
  const next = [...rows];
  next[index] = updated;
  storage.setItem(childObjectsBucketKey(profileId), JSON.stringify(next));
  return next;
}

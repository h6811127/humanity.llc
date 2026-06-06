/**
 * Pure landing resolver for /created/ Collection vs Focused Object (PR 1).
 */

export const CREATED_VIEW_COLLECTION = "collection";
export const CREATED_VIEW_FOCUSED_OBJECT = "focused_object";
export const CREATED_FOCUS_OBJECT_STORAGE_PREFIX = "hc_focus_object_id:";

/**
 * @param {string} profileId
 */
export function createdFocusObjectStorageKey(profileId) {
  return `${CREATED_FOCUS_OBJECT_STORAGE_PREFIX}${profileId}`;
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} sessionStorage
 * @param {string} profileId
 */
export function readCreatedFocusObjectId(sessionStorage, profileId) {
  if (!profileId) return null;
  try {
    const raw = sessionStorage?.getItem(createdFocusObjectStorageKey(profileId));
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    return trimmed || null;
  } catch {
    return null;
  }
}

/**
 * @param {Pick<Storage, "setItem" | "removeItem"> | null | undefined} sessionStorage
 * @param {string} profileId
 * @param {string | null | undefined} objectId
 */
export function writeCreatedFocusObjectId(sessionStorage, profileId, objectId) {
  if (!profileId || !sessionStorage) return;
  const key = createdFocusObjectStorageKey(profileId);
  const trimmed = typeof objectId === "string" ? objectId.trim() : "";
  try {
    if (trimmed) {
      sessionStorage.setItem(key, trimmed);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function isActiveChildRow(row) {
  return row?.status !== "disabled";
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} objectId
 */
function findActiveChildRowById(rows, objectId) {
  return rows.find((row) => isActiveChildRow(row) && row.object_id === objectId) ?? null;
}

/**
 * @param {{
 *   profileId?: string;
 *   objectIdParam?: string | null;
 *   explicitFocusObjectId?: string | null;
 *   childRows?: Record<string, unknown>[];
 *   collapsedPass?: boolean;
 * }} input
 */
export function resolveCreatedLandingView(input) {
  const rows = Array.isArray(input.childRows) ? input.childRows : [];
  const active = rows.filter(isActiveChildRow);
  const objectIdParam =
    typeof input.objectIdParam === "string" ? input.objectIdParam.trim() : "";
  const explicitFocusObjectId =
    typeof input.explicitFocusObjectId === "string"
      ? input.explicitFocusObjectId.trim()
      : "";

  if (objectIdParam) {
    const row = findActiveChildRowById(rows, objectIdParam);
    if (row) {
      return {
        view: CREATED_VIEW_FOCUSED_OBJECT,
        objectId: objectIdParam,
        staleObjectId: null,
      };
    }
    return {
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: objectIdParam,
    };
  }

  if (explicitFocusObjectId) {
    const row = findActiveChildRowById(rows, explicitFocusObjectId);
    if (row) {
      return {
        view: CREATED_VIEW_FOCUSED_OBJECT,
        objectId: explicitFocusObjectId,
        staleObjectId: null,
      };
    }
  }

  if (input.collapsedPass) {
    if (active.length === 1) {
      return {
        view: CREATED_VIEW_FOCUSED_OBJECT,
        objectId: String(active[0].object_id),
        staleObjectId: null,
        collapsedRoot: true,
      };
    }
    return {
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: null,
      staleObjectId: null,
      collapsedRoot: true,
    };
  }

  if (active.length === 0) {
    return {
      view: CREATED_VIEW_COLLECTION,
      objectId: null,
      staleObjectId: null,
    };
  }

  if (active.length === 1) {
    return {
      view: CREATED_VIEW_FOCUSED_OBJECT,
      objectId: String(active[0].object_id),
      staleObjectId: null,
    };
  }

  return {
    view: CREATED_VIEW_COLLECTION,
    objectId: null,
    staleObjectId: null,
  };
}

/**
 * Feature flag for /created/ Collection + Focused Object (PR 1).
 */

export const CREATED_COLLECTION_FLAG_KEY = "hc_created_collection";
export const CREATED_COLLECTION_FLAG_QUERY = "collection";

/**
 * @param {Pick<URLSearchParams, "get"> | null | undefined} searchParams
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function isCreatedCollectionFlagEnabled(searchParams, storage) {
  if (searchParams?.get(CREATED_COLLECTION_FLAG_QUERY) === "1") return true;
  try {
    return storage?.getItem(CREATED_COLLECTION_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Document | null | undefined} doc
 * @param {boolean} enabled
 */
export function syncCreatedCollectionFlagDataset(doc, enabled) {
  if (!doc?.body) return;
  if (enabled) {
    doc.body.dataset.createdCollection = "1";
  } else {
    delete doc.body.dataset.createdCollection;
  }
}

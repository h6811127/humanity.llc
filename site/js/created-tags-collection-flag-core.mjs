/**
 * Feature flag for /created/ tags collection (Phase 1 read-only eval).
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

export const CREATED_TAGS_COLLECTION_FLAG_KEY = "hc_created_tags_collection";
export const CREATED_TAGS_COLLECTION_FLAG_QUERY = "tags_collection";

/**
 * @param {Pick<URLSearchParams, "get"> | null | undefined} searchParams
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function isCreatedTagsCollectionFlagEnabled(searchParams, storage) {
  if (searchParams?.get(CREATED_TAGS_COLLECTION_FLAG_QUERY) === "1") return true;
  try {
    return storage?.getItem(CREATED_TAGS_COLLECTION_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Document | null | undefined} doc
 * @param {boolean} enabled
 */
export function syncCreatedTagsCollectionFlagDataset(doc, enabled) {
  if (!doc?.body) return;
  if (enabled) {
    doc.body.dataset.createdTagsCollection = "1";
  } else {
    delete doc.body.dataset.createdTagsCollection;
  }
}

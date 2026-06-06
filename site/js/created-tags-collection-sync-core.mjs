/**
 * Live sync hook for /created/ Attached QRs collection.
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

export const CREATED_TAGS_COLLECTION_SYNC_EVENT = "hc-created-tags-collection-sync";

/**
 * @param {Window | null | undefined} [win]
 */
export function dispatchCreatedTagsCollectionSync(win = typeof window !== "undefined" ? window : null) {
  win?.dispatchEvent?.(new Event(CREATED_TAGS_COLLECTION_SYNC_EVENT));
}

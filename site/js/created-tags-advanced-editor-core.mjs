/**
 * Pure helpers for /created/ Advanced editor demotion (Phase 2B).
 */

import {
  listCreatedTagsCollectionRows,
  shouldMountCreatedTagsCollection,
} from "./created-tags-collection-core.mjs";
import { readDeploySuccessPresentationState } from "./created-deploy-success-focus-core.mjs";

export const CREATED_TAGS_ADVANCED_EDITOR_SUMMARY = "Advanced editor";
export const CREATED_TAGS_ADVANCED_EDITOR_LEAD =
  "Use this for custody, time policy, disable, and legacy controls.";

/**
 * @param {number} attachedCount
 */
export function tagsAdvancedEditorDefaultOpen(attachedCount) {
  return attachedCount === 0;
}

/**
 * @param {Pick<Storage, "getItem">} [storage]
 */
export function tagsAdvancedEditorForcedOpen(storage) {
  const sessionStore =
    storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  return !!readDeploySuccessPresentationState(sessionStore);
}

/**
 * @param {number} attachedCount
 * @param {{ forcedOpen?: boolean }} [opts]
 */
export function tagsAdvancedEditorShouldBeOpen(attachedCount, opts = {}) {
  if (opts.forcedOpen) return true;
  return tagsAdvancedEditorDefaultOpen(attachedCount);
}

/**
 * @param {Pick<URLSearchParams, "get"> | null | undefined} searchParams
 * @param {Pick<Storage, "getItem">} storage
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} profileId
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldApplyTagsAdvancedDemotion(
  searchParams,
  storage,
  session,
  profileId,
  extras = {}
) {
  return shouldMountCreatedTagsCollection(searchParams, storage, session, profileId, extras);
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 * @param {{ forcedOpen?: boolean }} [opts]
 */
export function tagsAdvancedEditorOpenStateForProfile(storage, profileId, opts = {}) {
  const attachedCount = listCreatedTagsCollectionRows(storage, profileId).length;
  return tagsAdvancedEditorShouldBeOpen(attachedCount, opts);
}

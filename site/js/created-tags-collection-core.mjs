/**
 * Pure helpers for /created/ tags collection (Phase 1 read-only eval).
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  isActiveLostItemRelayRow,
  isActiveStatusPlateRow,
  isGeneralRootCardSession,
} from "./created-child-object-core.mjs";
import { isActiveGameNodeRow } from "./created-child-object-game-node-core.mjs";
import { formatCreatedHandleLabel } from "./created-display-labels-core.mjs";
import {
  hubChildObjectIdentityLine,
  hubChildObjectTitle,
  hubChildObjectTypeMeta,
} from "./hub-child-object-row-core.mjs";
import {
  childObjectTypeKindLabel,
  shouldShowChildObjectAddHubForRoot,
} from "./steward-child-object-list-policy-core.mjs";
import {
  CREATED_TAGS_COLLECTION_SYNC_EVENT,
  dispatchCreatedTagsCollectionSync,
} from "./created-tags-collection-sync-core.mjs";
import { isCreatedCollectionFlagEnabled } from "./created-collection-flag-core.mjs";
import { isCreatedTagsCollectionFlagEnabled } from "./created-tags-collection-flag-core.mjs";

export { CREATED_TAGS_COLLECTION_SYNC_EVENT, dispatchCreatedTagsCollectionSync };

export const CREATED_TAGS_COLLECTION_HEADER = "Attached QRs";
export const CREATED_TAGS_COLLECTION_ADD_LABEL = "Add QR";
export const CREATED_TAGS_COLLECTION_EMPTY_LABEL =
  "No attached QRs yet. Add a sign, tag, or checkpoint controlled by this root.";

/**
 * @param {string | null | undefined} handle
 */
export function createdTagsCollectionRootHandleLabel(handle) {
  return formatCreatedHandleLabel(handle) ?? "this root";
}

/**
 * @param {number} count
 */
export function createdTagsCollectionCountLabel(count) {
  if (count <= 0) return CREATED_TAGS_COLLECTION_HEADER;
  return `${CREATED_TAGS_COLLECTION_HEADER} (${count})`;
}

/**
 * @param {string | null | undefined} handle
 */
export function createdTagsCollectionLeadLabel(handle) {
  const handleLabel = createdTagsCollectionRootHandleLabel(handle);
  return `Scan points controlled by ${handleLabel}'s root QR.`;
}

/**
 * @param {unknown} objectType
 */
export function createdTagsCollectionRowKindLabel(objectType) {
  const type = typeof objectType === "string" ? objectType : "";
  if (type === "status_plate" || type === "lost_item_relay" || type === "game_node") {
    return childObjectTypeKindLabel(
      /** @type {"status_plate" | "lost_item_relay" | "game_node"} */ (type)
    );
  }
  return hubChildObjectTypeMeta(type).label;
}

/**
 * @param {unknown} objectType
 * @param {string | null | undefined} handle
 */
export function createdTagsCollectionRowIdentity(objectType, handle) {
  return hubChildObjectIdentityLine({
    objectTypeLabel: createdTagsCollectionRowKindLabel(objectType),
    rootHandle: createdTagsCollectionRootHandleLabel(handle),
  });
}

/**
 * @param {Record<string, unknown>} row
 */
export function isActiveChildObjectRow(row) {
  return (
    isActiveStatusPlateRow(row) ||
    isActiveLostItemRelayRow(row) ||
    isActiveGameNodeRow(row)
  );
}

/**
 * @param {Pick<Storage, "getItem">} storage
 * @param {string} profileId
 */
export function listCreatedTagsCollectionRows(storage, profileId) {
  return readChildObjectRows(storage, profileId)
    .filter(isActiveChildObjectRow)
    .sort((a, b) =>
      hubChildObjectTitle(a).localeCompare(hubChildObjectTitle(b), undefined, {
        sensitivity: "base",
      })
    );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} profileId
 * @param {Pick<Storage, "getItem">} storage
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldShowCreatedTagsCollection(session, profileId, storage, extras = {}) {
  if (!isGeneralRootCardSession(session)) return false;
  const rows = listCreatedTagsCollectionRows(storage, profileId);
  if (rows.length > 0) return true;
  return shouldShowChildObjectAddHubForRoot(session, profileId, storage, extras);
}

/**
 * @param {Pick<URLSearchParams, "get"> | null | undefined} searchParams
 * @param {Pick<Storage, "getItem">} storage
 * @param {Record<string, unknown> | null | undefined} session
 * @param {string} profileId
 * @param {{ activeRoom?: string | null; walletEntry?: Record<string, unknown> | null }} [extras]
 */
export function shouldMountCreatedTagsCollection(
  searchParams,
  storage,
  session,
  profileId,
  extras = {}
) {
  if (!isCreatedTagsCollectionFlagEnabled(searchParams, storage)) return false;
  if (isCreatedCollectionFlagEnabled(searchParams, storage)) return false;
  return shouldShowCreatedTagsCollection(session, profileId, storage, extras);
}

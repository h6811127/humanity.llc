/**
 * Pure helpers for /created/ Attached QRs manage panel (Phase 2A).
 * @see docs/CREATED_TAGS_COLLECTION_PHASE1.md
 */

import { createdTagsCollectionRowIdentity } from "./created-tags-collection-core.mjs";
import {
  hubChildObjectStatusLine,
  hubChildObjectTitle,
} from "./hub-child-object-row-core.mjs";

export const CREATED_TAGS_MANAGE_PANEL_TITLE = "Manage attached QR";
export const CREATED_TAGS_MANAGE_OPEN_SCAN_LABEL = "Open scan page";
export const CREATED_TAGS_MANAGE_UPDATE_STATUS_LABEL = "Update status";
export const CREATED_TAGS_MANAGE_ADVANCED_CUE =
  "Advanced editor below for custody, time policy, and disable.";

/**
 * @param {unknown} objectType
 * @param {string | null | undefined} handle
 */
export function createdTagsManagePanelSubtitle(objectType, handle) {
  return createdTagsCollectionRowIdentity(objectType, handle);
}

/**
 * @param {Record<string, unknown>} row
 * @param {string | null | undefined} handle
 */
export function createdTagsManagePanelPresentation(row, handle) {
  const scanUrl = typeof row.scan_url === "string" ? row.scan_url : "";
  const status = hubChildObjectStatusLine({
    publicState: row.public_state,
    scanUrl,
    status: row.status,
  });
  return {
    title: CREATED_TAGS_MANAGE_PANEL_TITLE,
    name: hubChildObjectTitle(row),
    subtitle: createdTagsManagePanelSubtitle(row.object_type, handle),
    statusLabel: status.label,
    statusTone: status.tone,
    scanUrl,
    canOpenScan: scanUrl.startsWith("http"),
    canUpdateStatus: createdTagsManageInlineEditorTarget(row.object_type)?.canFocusUpdate === true,
  };
}

/**
 * @param {unknown} objectType
 * @returns {{
 *   sectionId: string;
 *   listId: string;
 *   rowSelector: string;
 *   inputSelector: string | null;
 *   canFocusUpdate: boolean;
 * } | null}
 */
export function createdTagsManageInlineEditorTarget(objectType) {
  const type = typeof objectType === "string" ? objectType : "";
  if (type === "status_plate") {
    return {
      sectionId: "child-object-add-status-plate",
      listId: "child-object-status-plate-list",
      rowSelector: ".child-object-plate-row",
      inputSelector: '.child-object-plate-update-form input[name="public_state"]',
      canFocusUpdate: true,
    };
  }
  if (type === "lost_item_relay") {
    return {
      sectionId: "child-object-add-lost-item",
      listId: "child-object-lost-item-list",
      rowSelector: ".child-object-relay-row",
      inputSelector: '.child-object-relay-update-form input[name="public_state"]',
      canFocusUpdate: true,
    };
  }
  if (type === "game_node") {
    return {
      sectionId: "child-object-add-game-node",
      listId: "child-object-game-node-list",
      rowSelector: ".child-object-game-node-row",
      inputSelector: null,
      canFocusUpdate: false,
    };
  }
  return null;
}

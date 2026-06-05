/**
 * DOM sync for steward-facing display labels on /created/ (presentation only).
 */

import { readChildObjectRows } from "./child-object-store-core.mjs";
import { countActiveChildObjectsByType } from "./steward-child-object-list-policy-core.mjs";
import {
  CHILD_OBJECT_REGISTER_SUBMIT_LABEL,
  CREATED_ADD_FIRST_LOST_ITEM_TAG_BODY,
  CREATED_ADD_FIRST_LOST_ITEM_TAG_TITLE,
  CREATED_ADD_FIRST_SIGN_BODY,
  CREATED_ADD_FIRST_SIGN_TITLE,
  CREATED_ADD_LOST_ITEM_TAG_TITLE,
  CREATED_ADD_SIGN_TITLE,
  CREATED_CONNECTION_DETAILS_SUMMARY,
  CREATED_SETUP_FINISH_LABEL,
} from "./created-display-labels-core.mjs";

const REGISTER_SUBMIT_IDS = [
  "child-object-status-plate-submit",
  "child-object-lost-item-submit",
  "child-object-game-node-submit",
];

/**
 * Apply presentation labels that may be overwritten by boot or legacy HTML copy.
 */
export function syncCreatedPageDisplayLabels() {
  const finish = document.getElementById("created-setup-finish");
  if (finish) finish.textContent = CREATED_SETUP_FINISH_LABEL;

  for (const id of REGISTER_SUBMIT_IDS) {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = CHILD_OBJECT_REGISTER_SUBMIT_LABEL;
  }

  const advancedSummary = document.querySelector(".created-advanced-summary-text");
  if (advancedSummary) advancedSummary.textContent = CREATED_CONNECTION_DETAILS_SUMMARY;
}

/**
 * First-time vs repeat copy on add-object sections (presentation only).
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem">} [storage]
 */
export function syncChildObjectAddSectionLabels(profileId, storage = localStorage) {
  if (!profileId || !storage) return;
  const counts = countActiveChildObjectsByType(readChildObjectRows(storage, profileId));

  syncAddSectionLabels(
    "child-object-add-status-plate-title",
    "child-object-add-status-plate",
    counts.status_plate,
    CREATED_ADD_FIRST_SIGN_TITLE,
    CREATED_ADD_SIGN_TITLE,
    CREATED_ADD_FIRST_SIGN_BODY,
    "Add another sign on this account. Create a QR in one step (no new private key)."
  );

  syncAddSectionLabels(
    "child-object-add-lost-item-title",
    "child-object-add-lost-item",
    counts.lost_item_relay,
    CREATED_ADD_FIRST_LOST_ITEM_TAG_TITLE,
    CREATED_ADD_LOST_ITEM_TAG_TITLE,
    CREATED_ADD_FIRST_LOST_ITEM_TAG_BODY,
    "Add another lost-item tag on this account. Create a QR in one step (no new private key)."
  );
}

/**
 * @param {string} titleId
 * @param {string} sectionId
 * @param {number} activeCount
 * @param {string} firstTitle
 * @param {string} repeatTitle
 * @param {string} firstBody
 * @param {string} repeatBody
 */
function syncAddSectionLabels(
  titleId,
  sectionId,
  activeCount,
  firstTitle,
  repeatTitle,
  firstBody,
  repeatBody
) {
  const titleEl = document.getElementById(titleId);
  const section = document.getElementById(sectionId);
  const bodyEl = section?.querySelector(".created-what-now-body[data-child-object-add-chrome]");
  const isFirst = activeCount <= 0;
  if (titleEl) titleEl.textContent = isFirst ? firstTitle : repeatTitle;
  if (bodyEl instanceof HTMLElement) {
    bodyEl.textContent = isFirst ? firstBody : repeatBody;
  }
}

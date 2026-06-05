/**
 * DOM sync for steward-facing display labels on /created/ (presentation only).
 */

import {
  CHILD_OBJECT_REGISTER_SUBMIT_LABEL,
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

/**
 * View-only /created/ copy branches on saved wallet signing rows (P0-7 · R13).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-7
 * @see docs/KEY_LOSS_SAD_PATH_MATRIX.md
 */

import {
  VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY,
  VIEW_ONLY_MANAGE_TAB_LEAD_SAVED,
  VIEW_ONLY_NO_SESSION_WALLET_EMPTY,
  VIEW_ONLY_NO_SESSION_WALLET_SAVED,
  VIEW_ONLY_RESTORE_LEAD_EMPTY,
  VIEW_ONLY_RESTORE_LEAD_SAVED,
  VIEW_ONLY_LIVE_TAB_LEAD,
} from "./device-ownership-copy-core.mjs";

/** @typedef {"wallet_empty" | "wallet_saved"} ViewOnlyWalletBranch */

/**
 * @param {number} signingKeyCount
 * @returns {ViewOnlyWalletBranch}
 */
export function viewOnlyWalletBranch(signingKeyCount) {
  return signingKeyCount > 0 ? "wallet_saved" : "wallet_empty";
}

/**
 * @param {number} signingKeyCount
 * @returns {string}
 */
export function viewOnlyNoSessionDetailHtml(signingKeyCount) {
  return viewOnlyWalletBranch(signingKeyCount) === "wallet_saved"
    ? VIEW_ONLY_NO_SESSION_WALLET_SAVED
    : VIEW_ONLY_NO_SESSION_WALLET_EMPTY;
}

/**
 * @param {number} signingKeyCount
 * @returns {string}
 */
export function viewOnlyRestoreLead(signingKeyCount) {
  return viewOnlyWalletBranch(signingKeyCount) === "wallet_saved"
    ? VIEW_ONLY_RESTORE_LEAD_SAVED
    : VIEW_ONLY_RESTORE_LEAD_EMPTY;
}

/**
 * @param {number} signingKeyCount
 * @returns {string}
 */
export function viewOnlyManageTabLead(signingKeyCount) {
  return viewOnlyWalletBranch(signingKeyCount) === "wallet_saved"
    ? VIEW_ONLY_MANAGE_TAB_LEAD_SAVED
    : VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY;
}

/** Live tab read-only banner (Phase 3 — same branches as manage lead). */
export function viewOnlyLiveTabLead(_signingKeyCount = 0) {
  return VIEW_ONLY_LIVE_TAB_LEAD;
}

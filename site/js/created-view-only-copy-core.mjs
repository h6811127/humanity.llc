/**
 * View-only /created/ copy branches on saved wallet signing rows (P0-7 · R13).
 * @see docs/SAFARI_KEYS_CUSTODY.md
 */

import {
  OWNERSHIP_NOT_IN_TAB_PROMPT,
  OWNERSHIP_NOT_IN_TAB_SUBTITLE,
  OPEN_CONTROLS_ACTION,
  UNLOCK_NOT_IN_TAB_SUBTITLE,
  UNLOCK_TO_MANAGE_IN_THIS_TAB,
  UNLOCK_TO_MANAGE_PROMPT,
  VIEW_ONLY_LIVE_TAB_LEAD,
  VIEW_ONLY_MANAGE_TAB_LEAD_DEVICE_UNLOCK,
  VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY,
  VIEW_ONLY_MANAGE_TAB_LEAD_SAVED,
  VIEW_ONLY_NO_SESSION_WALLET_DEVICE_UNLOCK,
  VIEW_ONLY_NO_SESSION_WALLET_EMPTY,
  VIEW_ONLY_NO_SESSION_WALLET_SAVED,
  VIEW_ONLY_RESTORE_LEAD_DEVICE_UNLOCK,
  VIEW_ONLY_RESTORE_LEAD_EMPTY,
  VIEW_ONLY_RESTORE_LEAD_SAVED,
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
 * @param {boolean} [needsDeviceUnlock]
 * @returns {string}
 */
export function viewOnlyNoSessionDetailHtml(signingKeyCount, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return VIEW_ONLY_NO_SESSION_WALLET_EMPTY;
  }
  if (needsDeviceUnlock) {
    return VIEW_ONLY_NO_SESSION_WALLET_DEVICE_UNLOCK;
  }
  return VIEW_ONLY_NO_SESSION_WALLET_SAVED;
}

/**
 * @param {number} signingKeyCount
 * @param {boolean} [needsDeviceUnlock]
 * @returns {string}
 */
export function viewOnlyRestoreLead(signingKeyCount, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return VIEW_ONLY_RESTORE_LEAD_EMPTY;
  }
  if (needsDeviceUnlock) {
    return VIEW_ONLY_RESTORE_LEAD_DEVICE_UNLOCK;
  }
  return VIEW_ONLY_RESTORE_LEAD_SAVED;
}

/**
 * @param {number} signingKeyCount
 * @param {boolean} [needsDeviceUnlock]
 * @returns {string}
 */
export function viewOnlyManageTabLead(signingKeyCount, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY;
  }
  if (needsDeviceUnlock) {
    return VIEW_ONLY_MANAGE_TAB_LEAD_DEVICE_UNLOCK;
  }
  return VIEW_ONLY_MANAGE_TAB_LEAD_SAVED;
}

/** Live tab banner title (P1-2 step 2). */
export function viewOnlyLiveTabTitle(signingKeyCount, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return "View only in this tab";
  }
  return needsDeviceUnlock ? UNLOCK_TO_MANAGE_PROMPT : OWNERSHIP_NOT_IN_TAB_PROMPT;
}

/** Live tab read-only banner detail. */
export function viewOnlyLiveTabLead(signingKeyCount = 0, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return VIEW_ONLY_LIVE_TAB_LEAD;
  }
  return needsDeviceUnlock ? UNLOCK_NOT_IN_TAB_SUBTITLE : OWNERSHIP_NOT_IN_TAB_SUBTITLE;
}

/** Live tab restore CTA label. */
export function viewOnlyLiveTabRestoreLabel(signingKeyCount, needsDeviceUnlock = false) {
  if (viewOnlyWalletBranch(signingKeyCount) !== "wallet_saved") {
    return "Restore ownership";
  }
  return needsDeviceUnlock ? UNLOCK_TO_MANAGE_IN_THIS_TAB : OPEN_CONTROLS_ACTION;
}

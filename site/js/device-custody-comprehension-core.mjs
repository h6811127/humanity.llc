/**
 * device_unlock comprehension copy bundle (WS-CUSTODY G-C1).
 * @see docs/CUSTODY_DEVICE_UNLOCK_COMPREHENSION_QA.md
 */

import {
  CUSTODY_MODE_DEVICE_UNLOCK,
  resolveEntryCustodyMode,
} from "./device-custody-mode-core.mjs";
import {
  CUSTODY_RECOVERY_DEVICE_UNLOCK_PLATFORM_SYNC,
  CUSTODY_RECOVERY_NOT_PLATFORM_SYNC,
  DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT,
  SETUP_DONE_DEVICE_UNLOCK_IOS_DETAIL,
  SETUP_DONE_IOS_HOME_SCREEN_DETAIL,
  SETUP_PRINT_DEVICE_UNLOCK_HINT,
  SETUP_PRINT_IN_APP_HINT,
  SETUP_SEATBELT_DEVICE_UNLOCK_LEAD,
  SETUP_SEATBELT_PANEL_LEAD,
  SETUP_TEST_SCAN_DEVICE_UNLOCK_HINT,
  SETUP_TEST_SCAN_DEVICE_UNLOCK_LEAD,
  SETUP_TEST_SCAN_HINT,
  SETUP_TEST_SCAN_IN_APP_LABEL,
  SETUP_TEST_SCAN_PANEL_LEAD,
  SETUP_TEST_SCAN_PANEL_TITLE,
  SETUP_TEST_SCAN_EXTERNAL_LABEL,
} from "./device-ownership-copy-core.mjs";

/**
 * @param {{
 *   walletEntry?: Record<string, unknown> | null;
 *   session?: Record<string, unknown> | null;
 * }} input
 */
export function setupUsesDeviceUnlockComprehension(input) {
  const { walletEntry, session } = input;
  if (walletEntry && typeof walletEntry === "object") {
    return resolveEntryCustodyMode(walletEntry) === CUSTODY_MODE_DEVICE_UNLOCK;
  }
  if (session && typeof session === "object") {
    return resolveEntryCustodyMode(session) === CUSTODY_MODE_DEVICE_UNLOCK;
  }
  return false;
}

/**
 * @param {boolean} deviceUnlock
 */
export function buildSetupComprehensionCopyBundle(deviceUnlock) {
  if (deviceUnlock) {
    return {
      deviceUnlock: true,
      seatbeltLead: SETUP_SEATBELT_DEVICE_UNLOCK_LEAD,
      platformSync: CUSTODY_RECOVERY_DEVICE_UNLOCK_PLATFORM_SYNC,
      printHint: SETUP_PRINT_DEVICE_UNLOCK_HINT,
      testTitle: SETUP_TEST_SCAN_PANEL_TITLE,
      testLead: SETUP_TEST_SCAN_DEVICE_UNLOCK_LEAD,
      testHint: SETUP_TEST_SCAN_DEVICE_UNLOCK_HINT,
      testInAppLabel: SETUP_TEST_SCAN_IN_APP_LABEL,
      testExternalLabel: SETUP_TEST_SCAN_EXTERNAL_LABEL,
      doneIosDetail: SETUP_DONE_DEVICE_UNLOCK_IOS_DETAIL,
    };
  }
  return {
    deviceUnlock: false,
    seatbeltLead: SETUP_SEATBELT_PANEL_LEAD,
    platformSync: CUSTODY_RECOVERY_NOT_PLATFORM_SYNC,
    printHint: SETUP_PRINT_IN_APP_HINT,
    testTitle: SETUP_TEST_SCAN_PANEL_TITLE,
    testLead: SETUP_TEST_SCAN_PANEL_LEAD,
    testHint: SETUP_TEST_SCAN_HINT,
    testInAppLabel: SETUP_TEST_SCAN_IN_APP_LABEL,
    testExternalLabel: SETUP_TEST_SCAN_EXTERNAL_LABEL,
    doneIosDetail: SETUP_DONE_IOS_HOME_SCREEN_DETAIL,
  };
}

/**
 * Prefer canceled-unlock comprehension when WebAuthn dismisses (G-C1 · K10).
 * @param {string | null | undefined} error
 */
export function deviceUnlockActivationErrorCopy(error) {
  const msg = String(error ?? "").toLowerCase();
  if (
    msg.includes("cancel") ||
    msg.includes("abort") ||
    msg.includes("not allowed") ||
    msg.includes("denied")
  ) {
    return DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT;
  }
  return null;
}

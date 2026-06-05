/**
 * Landing focus-mode settings copy + navigation rules (testable).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md § Landing focus mode
 */

export const LANDING_SETTINGS_GROUP_SAVED = "Saved on this device";
export const LANDING_SETTINGS_GROUP_APP = "App settings";
export const LANDING_SETTINGS_GROUP_LEARN = "Learn";

export const LANDING_ROW_SAVED_CONTROLS_TITLE = "Saved controls";
export const LANDING_ROW_SAVED_CONTROLS_SUB = "QRs saved on this device";

export const LANDING_ROW_MANAGE_SAVED_QRS_TITLE = "Open current item";
export const LANDING_ROW_MANAGE_SAVED_QRS_SUB = "Update, revoke, or backup";

export const LANDING_ROW_RESTORE_ACCESS_TITLE = "Restore access";
export const LANDING_ROW_RESTORE_ACCESS_SUB = "Import backup or recovery code";

export const LANDING_ROW_ALERTS_TITLE = "Alerts";

export const LANDING_ROW_SIMPLE_MODE_TITLE = "Simple mode";
export const LANDING_ROW_SIMPLE_MODE_SUB_OFF = "Hide extra help";
export const LANDING_ROW_SIMPLE_MODE_SUB_ON = "Show intro again";

export const LANDING_LEARN_HELP_GUIDE_SUB = "How saved QRs work";
export const LANDING_LEARN_SAVED_CONTROLS_TITLE = "How saved controls work";
export const LANDING_LEARN_SAVED_CONTROLS_SUB = "Save, recover, and manage on this device";

export const HUB_RESTORE_SCROLL_TARGET_ID = "device-hub-restore-group-label";

export const MANAGE_SAVED_QRS_FALLBACK_HREF = "/wallet/";

/**
 * @param {Array<{ profile_id?: string }>} wallet
 * @param {string | null} lastActiveProfileId
 * @returns {Record<string, unknown> | null}
 */
export function resolveManageSavedQrsWalletEntry(wallet, lastActiveProfileId) {
  if (!Array.isArray(wallet) || wallet.length === 0) return null;
  const pid =
    typeof lastActiveProfileId === "string" && lastActiveProfileId.trim()
      ? lastActiveProfileId.trim()
      : null;
  if (pid) {
    const match = wallet.find((entry) => entry?.profile_id === pid);
    if (match) return match;
  }
  return wallet.length === 1 ? wallet[0] : null;
}

/**
 * @param {boolean} on
 */
export function simpleModeToggleSub(on) {
  return on ? LANDING_ROW_SIMPLE_MODE_SUB_ON : LANDING_ROW_SIMPLE_MODE_SUB_OFF;
}

/**
 * Landing focus mode boot — resolve intro vs hub-first before first paint.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-15 · landing focus
 */

export const LANDING_FOCUS_KEY = "hc_landing_focus";
export const LANDING_FOCUS_ON = "on";
export const LANDING_FOCUS_OFF = "off";

/**
 * @param {(key: string) => string | null} getItem
 */
export function hasLandingDeviceDataFromStorage(getItem) {
  try {
    const walletRaw = getItem("hc_wallet");
    if (walletRaw) {
      const wallet = JSON.parse(walletRaw);
      if (Array.isArray(wallet) && wallet.length > 0) return true;
    }
    const pinsRaw = getItem("hc_device_pins");
    if (pinsRaw) {
      const pins = JSON.parse(pinsRaw);
      if (Array.isArray(pins) && pins.length > 0) return true;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return false;
}

/**
 * @param {(key: string) => string | null} getItem
 */
export function isLandingFocusModeFromStorage(getItem) {
  const stored = getItem(LANDING_FOCUS_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return hasLandingDeviceDataFromStorage(getItem);
}

/**
 * @param {boolean} focusOn
 */
export function landingFocusDatasetValue(focusOn) {
  return focusOn ? LANDING_FOCUS_ON : LANDING_FOCUS_OFF;
}

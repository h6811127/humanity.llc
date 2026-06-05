/**
 * Pure device prefs copy for landing settings boot (testable).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-15
 */
import { STORAGE_BROWSER_NOTIF } from "./device-browser-notifications-core.mjs";
import { isResolverSyncTabsEnabled, RESOLVER_SYNC_PREF_KEY } from "./device-resolver-sync-core.mjs";

export const DEVICE_PREFS_BOOT_PENDING = "pending";
export const DEVICE_PREFS_BOOT_READY = "ready";

export const AUTO_SAVE_KEY = "hc_auto_save_device";
export const QUIET_TAB_REHYDRATE_KEY = "hc_quiet_tab_rehydrate";
const THEME_KEY = "hc_theme";

/**
 * @param {string | null | undefined} stored
 */
export function autoSaveEnabledFromStorage(stored) {
  if (stored === "0") return false;
  return true;
}

/**
 * @param {string | null | undefined} stored
 */
export function quietTabRehydrateEnabledFromStorage(stored) {
  if (stored === "0") return false;
  return true;
}

/** @typedef {'default' | 'granted' | 'denied' | 'unsupported'} NotificationPermissionState */

/**
 * @param {string | null | undefined} raw
 */
export function browserNotifEnabledFromStorage(raw) {
  return raw === "on";
}

/**
 * @param {boolean} on
 * @param {NotificationPermissionState} permission
 */
export function browserNotifTogglePressed(on, permission) {
  return on && permission === "granted";
}

/**
 * @param {boolean} on
 * @param {NotificationPermissionState} permission
 * @param {{ standalone?: boolean }} [opts]
 */
export function browserNotifToggleSub(on, permission, opts = {}) {
  if (permission === "unsupported") return "Not supported in this browser";
  if (on && permission === "granted") return "On · live proof in background";
  if (permission === "denied") return "Blocked · enable in system settings";
  if (opts.standalone) return "Off · tap to allow";
  return "Off · works best when installed";
}

/**
 * @param {boolean} on
 */
export function resolverSyncToggleSub(on) {
  return on
    ? "On · other tabs use the same last check"
    : "Off · each tab checks on its own";
}

/**
 * @param {boolean} on
 */
export function autoSaveToggleSub(on) {
  return on
    ? "On · new cards stay on this device (default)"
    : "Off · save manually after each create";
}

/**
 * @param {boolean} on
 */
export function quietTabRehydrateToggleSub(on) {
  return on
    ? "On · new tabs continue your last object (default)"
    : "Off · pick an object when you open a new tab";
}

/**
 * @param {'light' | 'dark'} theme
 */
export function themeToggleSub(theme) {
  return theme === "dark" ? "Dark · OLED black" : "Light · default";
}

/**
 * @param {'light' | 'dark'} theme
 */
export function themeTogglePressed(theme) {
  return theme === "dark";
}

/**
 * @param {string | null | undefined} raw
 */
export function themeFromStorage(raw) {
  return raw === "dark" ? "dark" : "light";
}

/**
 * Snapshot prefs from storage reads (no Notification API).
 * @param {{
 *   browserNotif?: string | null;
 *   resolverSync?: string | null;
 *   autoSave?: string | null;
 *   quietTabRehydrate?: string | null;
 *   theme?: string | null;
 * }} stored
 */
export function devicePrefsFromStorage(stored = {}) {
  return {
    browserNotifOn: browserNotifEnabledFromStorage(stored.browserNotif ?? null),
    resolverSyncOn: isResolverSyncTabsEnabled(stored.resolverSync ?? null),
    autoSaveOn: autoSaveEnabledFromStorage(stored.autoSave ?? null),
    quietTabRehydrateOn: quietTabRehydrateEnabledFromStorage(
      stored.quietTabRehydrate ?? null
    ),
    theme: themeFromStorage(stored.theme ?? null),
  };
}

export const DEVICE_PREFS_STORAGE_KEYS = {
  browserNotif: STORAGE_BROWSER_NOTIF,
  resolverSync: RESOLVER_SYNC_PREF_KEY,
  autoSave: AUTO_SAVE_KEY,
  quietTabRehydrate: QUIET_TAB_REHYDRATE_KEY,
  theme: THEME_KEY,
};

/**
 * @param {string | undefined} state html dataset.prefsBoot
 */
export function isDevicePrefsBootReady(state) {
  return state === DEVICE_PREFS_BOOT_READY;
}

/**
 * @param {string | undefined} state html dataset.prefsBoot
 */
export function shouldHideDevicePrefsUntilBoot(state) {
  return !state || state === DEVICE_PREFS_BOOT_PENDING;
}

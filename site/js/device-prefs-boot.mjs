/**
 * Apply landing device prefs to toggle buttons before first meaningful paint.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-15
 */
import {
  autoSaveToggleSub,
  browserNotifTogglePressed,
  browserNotifToggleSub,
  DEVICE_PREFS_BOOT_READY,
  devicePrefsFromStorage,
  DEVICE_PREFS_STORAGE_KEYS,
  quietTabRehydrateToggleSub,
  resolverSyncToggleSub,
  themeTogglePressed,
  themeToggleSub,
} from "./device-prefs-boot-core.mjs";
import { LANDING_ROW_ALERTS_TITLE } from "./landing-focus-settings-copy-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import { syncBrowserTabOnlyShortcutRows } from "./pwa-browser-tab-shortcuts.mjs";

/** @returns {import("./device-prefs-boot-core.mjs").NotificationPermissionState} */
function readNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  const perm = Notification.permission;
  if (perm === "granted" || perm === "denied") return perm;
  return "default";
}

/**
 * @param {HTMLButtonElement} btn
 * @param {{ title: string, sub: string, pressed: boolean, disabled?: boolean }} copy
 */
function applyListToggleCopy(btn, copy) {
  btn.setAttribute("aria-pressed", copy.pressed ? "true" : "false");
  if (copy.disabled) btn.disabled = true;
  else btn.removeAttribute("disabled");
  const title = btn.querySelector(".list-title");
  const sub = btn.querySelector(".list-sub");
  if (title && sub) {
    title.textContent = copy.title;
    sub.textContent = copy.sub;
  }
}

/**
 * @param {Pick<Storage, "getItem"> | undefined} storage
 */
function readPrefsStorage(storage) {
  const read =
    storage ??
    (typeof localStorage !== "undefined" ? localStorage : null);
  if (!read) {
    return devicePrefsFromStorage({});
  }
  try {
    return devicePrefsFromStorage({
      browserNotif: read.getItem(DEVICE_PREFS_STORAGE_KEYS.browserNotif),
      resolverSync: read.getItem(DEVICE_PREFS_STORAGE_KEYS.resolverSync),
      autoSave: read.getItem(DEVICE_PREFS_STORAGE_KEYS.autoSave),
      quietTabRehydrate: read.getItem(DEVICE_PREFS_STORAGE_KEYS.quietTabRehydrate),
      theme: read.getItem(DEVICE_PREFS_STORAGE_KEYS.theme),
    });
  } catch {
    return devicePrefsFromStorage({});
  }
}

/**
 * @param {Document | undefined} doc
 * @param {{ storage?: Pick<Storage, "getItem">, permission?: import("./device-prefs-boot-core.mjs").NotificationPermissionState }} [opts]
 */
export function applyDevicePrefsBootToDocument(doc = document, opts = {}) {
  const root = doc?.documentElement;
  if (!root) return;

  const win = doc.defaultView;
  syncBrowserTabOnlyShortcutRows(
    doc,
    readStandaloneModeFromWindow(win ?? undefined)
  );

  const prefs = readPrefsStorage(opts.storage);
  const permission = opts.permission ?? readNotificationPermission();
  const standalone = readStandaloneModeFromWindow(win ?? undefined);

  doc.querySelectorAll("[data-device-browser-notif-toggle]").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    applyListToggleCopy(el, {
      title: LANDING_ROW_ALERTS_TITLE,
      sub: browserNotifToggleSub(prefs.browserNotifOn, permission, { standalone }),
      pressed: browserNotifTogglePressed(prefs.browserNotifOn, permission),
      disabled: permission === "unsupported",
    });
  });

  const resolverBtn = doc.getElementById("device-resolver-sync-toggle");
  if (resolverBtn instanceof HTMLButtonElement) {
    applyListToggleCopy(resolverBtn, {
      title: "Share network checks",
      sub: resolverSyncToggleSub(prefs.resolverSyncOn),
      pressed: prefs.resolverSyncOn,
    });
  }

  const autoSaveBtn = doc.getElementById("device-auto-save-toggle");
  if (autoSaveBtn instanceof HTMLButtonElement) {
    applyListToggleCopy(autoSaveBtn, {
      title: "Auto-save",
      sub: autoSaveToggleSub(prefs.autoSaveOn),
      pressed: prefs.autoSaveOn,
    });
  }

  const quietBtn = doc.getElementById("device-quiet-tab-rehydrate-toggle");
  if (quietBtn instanceof HTMLButtonElement) {
    applyListToggleCopy(quietBtn, {
      title: "Open last object in new tabs",
      sub: quietTabRehydrateToggleSub(prefs.quietTabRehydrateOn),
      pressed: prefs.quietTabRehydrateOn,
    });
  }

  doc.querySelectorAll("[data-device-theme-toggle]").forEach((el) => {
    if (!(el instanceof HTMLButtonElement)) return;
    applyListToggleCopy(el, {
      title: "Appearance",
      sub: themeToggleSub(prefs.theme),
      pressed: themeTogglePressed(prefs.theme),
    });
  });
}

/**
 * Mark prefs boot ready on <html> (inline head script may call equivalent).
 * @param {Document | undefined} doc
 */
export function markDevicePrefsBootReady(doc = document) {
  doc?.documentElement?.setAttribute("data-prefs-boot", DEVICE_PREFS_BOOT_READY);
}

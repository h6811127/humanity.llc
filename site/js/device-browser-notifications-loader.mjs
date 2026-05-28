/**
 * Lazy loader for browser notifications — shrinks device-status static graph.
 * @see docs/SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md P2
 * @see docs/UI_UX_SAFE_REBUILD_IMPLEMENTATION.md Step 2 (inbox loader pattern)
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

/** @type {Promise<typeof import("./device-browser-notifications.mjs")> | null} */
let browserNotificationsModulePromise = null;

/** @type {Promise<void> | null} */
let initPromise = null;

function loadBrowserNotificationsModule() {
  if (!browserNotificationsModulePromise) {
    browserNotificationsModulePromise = import(
      `./device-browser-notifications.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`
    );
  }
  return browserNotificationsModulePromise;
}

export function initBrowserNotifications() {
  if (!initPromise) {
    initPromise = loadBrowserNotificationsModule().then((mod) => {
      mod.initBrowserNotifications();
    });
  }
  return initPromise;
}

export function syncBrowserNotifPrompts() {
  void loadBrowserNotificationsModule().then(async (mod) => {
    if (initPromise) await initPromise;
    mod.syncBrowserNotifPrompts();
  });
}

export function mountBrowserNotifToggles() {
  void loadBrowserNotificationsModule().then(async (mod) => {
    if (initPromise) await initPromise;
    mod.mountBrowserNotifToggles();
  });
}

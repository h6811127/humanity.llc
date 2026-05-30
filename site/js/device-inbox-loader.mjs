/**
 * Lazy loader for device-inbox — shrinks device-status static graph.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § P2 optional hardening
 * @see docs/SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md P2
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

/** @type {Promise<typeof import("./device-inbox.mjs")> | null} */
let inboxModulePromise = null;

/** @type {typeof import("./device-inbox.mjs") | null} */
let inboxModule = null;

export function loadInboxModule() {
  if (!inboxModulePromise) {
    inboxModulePromise = import(`./device-inbox.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`).then(
      (mod) => {
        inboxModule = mod;
        return mod;
      }
    );
  }
  return inboxModulePromise;
}

/** @returns {import("./device-dot-state-core.mjs").DotInboxOverlay} */
export function getInboxDotOverlay() {
  if (inboxModule) return inboxModule.getInboxDotOverlay();
  return "none";
}

export function notificationCount() {
  if (inboxModule) return inboxModule.notificationCount();
  return 0;
}

/**
 * @returns {import("./device-inbox-core.mjs").InboxItem[]}
 */
export function getInboxItems() {
  if (inboxModule) return inboxModule.getInboxItems();
  return [];
}

/** @returns {Parameters<typeof import("./device-inbox.mjs").buildInboxItems>[0]} */
export function gatherInboxInput() {
  if (inboxModule) return inboxModule.gatherInboxInput();
  return {
    tabNoticeCount: 0,
    liveProofCount: 0,
    crossTabEntries: [],
    orphanRemovedEntries: [],
    tabSessionLabel: "This tab",
    cardDisabledSinceVisit: [],
  };
}

export function beginDeviceChromeRefreshTick() {
  if (inboxModule) {
    inboxModule.beginDeviceChromeRefreshTick();
    return;
  }
  void loadInboxModule().then((mod) => mod.beginDeviceChromeRefreshTick());
}

export function endDeviceChromeRefreshTick() {
  if (inboxModule) {
    inboxModule.endDeviceChromeRefreshTick();
    return;
  }
  void loadInboxModule().then((mod) => mod.endDeviceChromeRefreshTick());
}

export function resetPresenceInboxGatherCache() {
  if (inboxModule) {
    inboxModule.resetPresenceInboxGatherCache();
    return;
  }
  void loadInboxModule().then((mod) => mod.resetPresenceInboxGatherCache());
}

/**
 * Preload inbox; optional callback after module is ready (e.g. refresh dot/badge).
 * @param {() => void} [onReady]
 */
export function preloadInboxModule(onReady) {
  void loadInboxModule().then(() => {
    onReady?.();
  });
}

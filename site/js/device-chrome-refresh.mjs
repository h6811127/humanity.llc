/**
 * Single coordinator for cross-tab / inbox chrome refresh.
 * @see docs/CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md
 */
import { DEVICE_OS_DEBOUNCE_MS } from "./device-os-coordinator-core.mjs";
import {
  presenceChromeRefreshScheduleAction,
  shouldRunChromeRefreshImmediate,
} from "./device-chrome-refresh-core.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { refreshHubGlance } from "./device-hub-glance.mjs";
import { refreshHubInboxAlertsFromChrome } from "./device-hub-ui.mjs";
import { renderInboxSheet, isInboxSheetOpen, setInboxSheetOpen } from "./device-inbox-sheet.mjs";
import { notificationCount } from "./device-inbox.mjs?v=37";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { REMOVED_PROFILES_STORAGE_KEY } from "./device-wallet-removed-profiles-core.mjs";
import { refreshWalletContextFromChrome } from "./wallet-page-chrome.mjs";

const PRESENCE_STORAGE_KEY = "hc_tab_keys_presence";

/** @type {(() => void) | null} */
let refreshStatusSurfaces = null;

let presenceDebounceTimer = null;
let listenersBound = false;

/**
 * Register status dot / badge / hub panel refresh (device-status.mjs).
 * @param {() => void} fn
 */
export function setRefreshStatusSurfaces(fn) {
  refreshStatusSurfaces = fn;
}

/** Raw presence before fingerprint streak — used for immediate hide. */
export function crossTabPresenceActiveRaw() {
  const tabNotice = tabNoticeCount();
  const generic = getOtherTabsWithKeys().length;
  const orphan = getOrphanRemovedTabsWithKeys().length;
  return (
    shouldShowCrossTabKeysNotice(generic, tabNotice) ||
    shouldShowOrphanRemovedKeysNotice(orphan, tabNotice)
  );
}

/**
 * @param {{ immediate?: boolean }} [opts]
 */
export function refreshDeviceChrome(opts = {}) {
  const immediate = shouldRunChromeRefreshImmediate(
    crossTabPresenceActiveRaw(),
    Boolean(opts.immediate)
  );

  if (immediate) {
    if (presenceDebounceTimer != null) {
      clearTimeout(presenceDebounceTimer);
      presenceDebounceTimer = null;
    }
    runChromeRefresh();
    return;
  }

  const action = presenceChromeRefreshScheduleAction(
    crossTabPresenceActiveRaw(),
    presenceDebounceTimer
  );

  if (action.clearTimer && presenceDebounceTimer != null) {
    clearTimeout(presenceDebounceTimer);
    presenceDebounceTimer = null;
  }

  if (action.action === "run_now") {
    runChromeRefresh();
    return;
  }

  if (action.action === "schedule") {
    presenceDebounceTimer = window.setTimeout(() => {
      presenceDebounceTimer = null;
      runChromeRefresh();
    }, DEVICE_OS_DEBOUNCE_MS);
  }
}

function runChromeRefresh() {
  refreshStatusSurfaces?.();
  renderCrossTabKeysBanner();
  refreshHubGlance();
  refreshHubInboxAlertsFromChrome();
  if (isInboxSheetOpen()) {
    renderInboxSheet();
    if (notificationCount() === 0) {
      setInboxSheetOpen(false);
    }
  }
  refreshWalletContextFromChrome();
}

function onPresenceChanged() {
  refreshDeviceChrome();
}

function onImmediateChromeEvent() {
  refreshDeviceChrome({ immediate: true });
}

function onStorageKey(e) {
  const key = e.key;
  if (
    key === "hc_wallet" ||
    key === "hc_created" ||
    key === PRESENCE_STORAGE_KEY ||
    key === REMOVED_PROFILES_STORAGE_KEY ||
    key === "hc_device_pins" ||
    key === "hc_device_activity"
  ) {
    onImmediateChromeEvent();
  }
}

/** Subscribe once — presence, hub, wallet custody, network-adjacent storage. */
export function startDeviceChromeRefresh() {
  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("hc-tab-presence-changed", onPresenceChanged);
  window.addEventListener("hc-device-hub-changed", onImmediateChromeEvent);
  window.addEventListener("hc-live-control-inbox-changed", onImmediateChromeEvent);
  window.addEventListener("hc-wallet-removed-profiles-changed", onImmediateChromeEvent);
  window.addEventListener("storage", onStorageKey);
}

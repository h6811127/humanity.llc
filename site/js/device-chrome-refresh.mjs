/**
 * Single coordinator for cross-tab / inbox chrome refresh.
 * @see docs/CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md
 */
import { DEVICE_OS_DEBOUNCE_MS } from "./device-os-coordinator-core.mjs";
import {
  presenceChromeDebounceMs,
  presenceChromeFingerprint,
  presenceChromeRefreshScheduleAction,
  shouldChromeRefreshStorageImmediately,
  shouldRunChromeRefreshImmediate,
  shouldSkipPresenceChromeRefresh,
} from "./device-chrome-refresh-core.mjs";
import { getWalletCount } from "./device-wallet.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { renderCrossTabKeysBanner } from "./device-cross-tab-banner.mjs";
import { refreshHubGlance } from "./device-hub-glance.mjs";
import { refreshHubInboxAlertsFromChrome } from "./device-hub-ui.mjs";
import { renderInboxSheet, isInboxSheetOpen, setInboxSheetOpen } from "./device-inbox-sheet.mjs";
import {
  beginDeviceChromeRefreshTick,
  endDeviceChromeRefreshTick,
  resetPresenceInboxGatherCache,
} from "./device-inbox.mjs?v=57";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { primeCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { refreshWalletContextFromChrome } from "./wallet-page-chrome.mjs";

/** @type {(() => void) | null} */
let refreshStatusSurfaces = null;

let presenceDebounceTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let presenceChromeCoalesceTimer = null;
let lastPresenceChromeFingerprint = "";
let listenersBound = false;

function readPresenceChromeFingerprint() {
  const tabNotice = tabNoticeCount();
  const generic = getOtherTabsWithKeys().length;
  const orphan = getOrphanRemovedTabsWithKeys().length;
  return presenceChromeFingerprint({
    tabNotice,
    genericCount: generic,
    orphanCount: orphan,
  });
}

/**
 * Register status dot / badge / hub panel refresh (device-status.mjs).
 * @param {() => void} fn
 */
export function setRefreshStatusSurfaces(fn) {
  refreshStatusSurfaces = fn;
}

/** Raw presence before fingerprint streak - used for immediate hide. */
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
  beginDeviceChromeRefreshTick();
  try {
    refreshStatusSurfaces?.();
    renderCrossTabKeysBanner();
    refreshHubGlance();
    refreshHubInboxAlertsFromChrome();
    if (isInboxSheetOpen()) {
      renderInboxSheet();
    }
    refreshWalletContextFromChrome();
  } finally {
    lastPresenceChromeFingerprint = readPresenceChromeFingerprint();
    endDeviceChromeRefreshTick();
  }
}

function schedulePresenceChromeRefresh() {
  const nextFp = readPresenceChromeFingerprint();
  if (shouldSkipPresenceChromeRefresh(lastPresenceChromeFingerprint, nextFp)) {
    return;
  }

  primeCrossTabNotificationState();

  if (presenceChromeCoalesceTimer != null) {
    clearTimeout(presenceChromeCoalesceTimer);
  }

  presenceChromeCoalesceTimer = window.setTimeout(() => {
    presenceChromeCoalesceTimer = null;
    const fpNow = readPresenceChromeFingerprint();
    if (shouldSkipPresenceChromeRefresh(lastPresenceChromeFingerprint, fpNow)) {
      return;
    }
    if (presenceDebounceTimer != null) {
      clearTimeout(presenceDebounceTimer);
      presenceDebounceTimer = null;
    }
    runChromeRefresh();
  }, presenceChromeDebounceMs(getWalletCount()));
}

function onPresenceChanged() {
  if (!crossTabPresenceActiveRaw()) {
    if (presenceChromeCoalesceTimer != null) {
      clearTimeout(presenceChromeCoalesceTimer);
      presenceChromeCoalesceTimer = null;
    }
    refreshDeviceChrome();
    return;
  }
  schedulePresenceChromeRefresh();
}

function onImmediateChromeEvent() {
  refreshDeviceChrome({ immediate: true });
}

function onStorageKey(e) {
  if (!shouldChromeRefreshStorageImmediately(e.key)) return;
  onImmediateChromeEvent();
}

/** Subscribe once - presence, hub, wallet custody, network-adjacent storage. */
export function startDeviceChromeRefresh() {
  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("hc-tab-presence-changed", onPresenceChanged);
  window.addEventListener("hc-device-hub-changed", onImmediateChromeEvent);
  // Live-proof / inbox updates change `getInboxItems()`; invalidate gather cache so
  // the shell badge and inbox sheet reflect the new pending set immediately.
  window.addEventListener("hc-live-control-inbox-changed", () => {
    resetPresenceInboxGatherCache();
    onImmediateChromeEvent();
  });
  window.addEventListener("hc-wallet-removed-profiles-changed", onImmediateChromeEvent);
  window.addEventListener("storage", onStorageKey);
}

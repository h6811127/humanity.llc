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
import { renderLiveProofBanner } from "./device-live-proof-banner.mjs";
import { refreshHubGlance } from "./device-hub-glance.mjs";
import { refreshHubInboxAlertsFromChrome } from "./device-hub-ui.mjs";
import { loadInboxSheetModule } from "./device-inbox-sheet-loader.mjs";
import {
  loadInboxModule,
  resetPresenceInboxGatherCache,
} from "./device-inbox-loader.mjs?v=81";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";
import { primeCrossTabNotificationState } from "./device-cross-tab-state.mjs";
import { refreshWalletContextFromChrome } from "./wallet-page-chrome.mjs";
import { markDeviceBootReadyIfShellPage } from "./device-shell-boot.mjs";
import { isDeviceBootReadyState } from "./device-shell-boot-core.mjs";
import {
  initShellBfcacheResumeGate,
  SHELL_BFCACHE_RESTORE_EVENT,
} from "./device-shell-resume.mjs";
import { shouldSuppressCrossTabChromeUntilShellBoot } from "./device-cross-tab-boot-core.mjs";

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
  const bootState = document.body?.dataset?.boot;
  if (shouldSuppressCrossTabChromeUntilShellBoot(bootState)) return false;

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
  void runChromeRefreshAsync();
}

async function runChromeRefreshAsync() {
  const inbox = await loadInboxModule();
  inbox.beginDeviceChromeRefreshTick();
  try {
    refreshStatusSurfaces?.();
    renderLiveProofBanner();
    renderCrossTabKeysBanner();
    refreshHubGlance();
    refreshHubInboxAlertsFromChrome();
    const sheetMod = await loadInboxSheetModule();
    if (sheetMod.isInboxSheetOpen()) {
      sheetMod.renderInboxSheet();
    }
    refreshWalletContextFromChrome();
    const bootBefore = document.body?.dataset?.boot;
    markDeviceBootReadyIfShellPage();
    const bootJustReady =
      !isDeviceBootReadyState(bootBefore) &&
      isDeviceBootReadyState(document.body?.dataset?.boot);
    if (bootJustReady) {
      refreshStatusSurfaces?.();
      renderLiveProofBanner();
      renderCrossTabKeysBanner();
    }
  } finally {
    lastPresenceChromeFingerprint = readPresenceChromeFingerprint();
    inbox.endDeviceChromeRefreshTick();
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
  window.addEventListener("hc-auto-save-changed", onImmediateChromeEvent);
  // Live-proof / inbox updates change `getInboxItems()`; invalidate gather cache so
  // the shell badge and inbox sheet reflect the new pending set immediately.
  window.addEventListener("hc-live-control-inbox-changed", () => {
    resetPresenceInboxGatherCache();
    onImmediateChromeEvent();
  });
  window.addEventListener("hc-wallet-removed-profiles-changed", onImmediateChromeEvent);
  window.addEventListener("storage", onStorageKey);
  initShellBfcacheResumeGate();
  window.addEventListener(SHELL_BFCACHE_RESTORE_EVENT, () => {
    resetPresenceInboxGatherCache();
    refreshDeviceChrome({ immediate: true });
  });
}

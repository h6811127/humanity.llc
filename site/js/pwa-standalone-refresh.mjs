/**
 * Standalone PWA soft refresh on resume (lazy-loaded after device status bootstrap).
 * @see docs/PWA_INSTALL.md § Standalone refresh & resume — Phase 6
 */

import { refreshDeviceChrome } from "./device-chrome-refresh.mjs";
import { refreshDeviceHub } from "./device-hub-ui.mjs";
import {
  readStandaloneModeFromWindow,
  runStandaloneSoftRefreshPipeline,
  shouldTriggerStandaloneResumeRefresh,
  STANDALONE_SOFT_REFRESH_DEBOUNCE_MS,
} from "./pwa-standalone-refresh-core.mjs";

let debounceTimer = null;
let listenersBound = false;

/**
 * @param {string} reason
 */
function runStandaloneSoftRefresh(reason) {
  runStandaloneSoftRefreshPipeline(
    {
      refreshDeviceHub,
      refreshDeviceChrome,
    },
    { reason }
  );
}

/**
 * @param {string} reason
 */
function scheduleStandaloneSoftRefresh(reason) {
  if (!readStandaloneModeFromWindow(window)) return;
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    runStandaloneSoftRefresh(reason);
  }, STANDALONE_SOFT_REFRESH_DEBOUNCE_MS);
}

function onVisibilityResume() {
  if (
    !shouldTriggerStandaloneResumeRefresh({
      standalone: readStandaloneModeFromWindow(window),
      eventKind: "visibilitychange",
      visibilityState: document.visibilityState,
    })
  ) {
    return;
  }
  scheduleStandaloneSoftRefresh("visibility");
}

/**
 * @param {PageTransitionEvent} ev
 */
function onPageShowResume(ev) {
  if (
    !shouldTriggerStandaloneResumeRefresh({
      standalone: readStandaloneModeFromWindow(window),
      eventKind: "pageshow",
      pageshowPersisted: ev.persisted,
    })
  ) {
    return;
  }
  scheduleStandaloneSoftRefresh("pageshow");
}

function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener("visibilitychange", onVisibilityResume);
  window.addEventListener("pageshow", onPageShowResume);
}

bindListeners();

export {
  runStandaloneSoftRefresh as runStandaloneSoftRefreshForTests,
  scheduleStandaloneSoftRefresh as scheduleStandaloneSoftRefreshForTests,
};

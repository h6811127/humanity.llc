/**
 * Loads device-status.mjs; surfaces load failures on #top-chrome.
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md - Fix directions §1
 * @see docs/SITE_BUILD_VERSIONING.md - Phase 1 console build stamp
 */
import { formatSiteBuildConsoleLine } from "./build-meta-browser.mjs";
import { SITE_BUILD_META } from "./build-meta.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

console.info(formatSiteBuildConsoleLine(SITE_BUILD_META));

const statusModuleUrl = new URL(
  `./device-status.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
  import.meta.url
);

function markChromeLoadError(message) {
  const chrome = document.getElementById("top-chrome");
  if (chrome) {
    chrome.dataset.deviceStatusError = "1";
    chrome.setAttribute(
      "title",
      "Device status failed to load. Try a hard refresh or check the network tab."
    );
  }
  console.error("[humanity] Device status module failed to load:", message);
}

import(statusModuleUrl.href)
  .then(() => {
    document.getElementById("top-chrome")?.removeAttribute("data-device-status-error");
  })
  .catch((err) => {
    markChromeLoadError(err?.message || String(err));
  });

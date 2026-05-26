/**
 * Loads device-status.mjs; surfaces load failures on #top-chrome.
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md — Fix directions §1
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

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

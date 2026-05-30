/**
 * Status bootstrap implementation (dynamic import from device-status-bootstrap.mjs).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md - Fix directions §1
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md - Load-error dot explainer
 * @see docs/SITE_BUILD_VERSIONING.md - Phase 1 console build stamp
 */
import { formatSiteBuildConsoleLine } from "./build-meta-browser.mjs";
import { SITE_BUILD_META } from "./build-meta.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";
import {
  wireStatusLoadErrorDot,
  wireStatusPartialLoadDot,
} from "./device-status-load-error.mjs";
import { isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";

console.info(formatSiteBuildConsoleLine(SITE_BUILD_META));

const statusCoreUrl = new URL(
  `./device-status-core.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
  import.meta.url
);
const statusModuleUrl = new URL(
  `./device-status.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
  import.meta.url
);

let statusCoreLoaded = false;

import(statusCoreUrl.href)
  .then(() => {
    statusCoreLoaded = true;
    return import(statusModuleUrl.href);
  })
  .then(() => {
    const chrome = document.getElementById("top-chrome");
    chrome?.removeAttribute("data-device-status-error");
    chrome?.removeAttribute("data-device-status-partial");
    if (isPwaShellPagePath(window.location.pathname)) {
      const pwaUrl = new URL(
        `./pwa-install.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
        import.meta.url
      );
      import(pwaUrl.href).catch(() => {});
      const standaloneRefreshUrl = new URL(
        `./pwa-standalone-refresh.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
        import.meta.url
      );
      import(standaloneRefreshUrl.href).catch(() => {});
      const safariItpUrl = new URL(
        `./safari-itp-storage-notice.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
        import.meta.url
      );
      import(safariItpUrl.href).catch(() => {});
      const persistDeniedUrl = new URL(
        `./safari-storage-persist-denied-notice.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
        import.meta.url
      );
      import(persistDeniedUrl.href).catch(() => {});
    }
  })
  .catch((err) => {
    if (statusCoreLoaded) {
      wireStatusPartialLoadDot(err?.message || String(err));
      return;
    }
    wireStatusLoadErrorDot(err?.message || String(err));
  });

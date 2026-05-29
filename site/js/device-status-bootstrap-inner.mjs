/**
 * Status bootstrap implementation (dynamic import from device-status-bootstrap.mjs).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md - Fix directions §1
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md - Load-error dot explainer
 * @see docs/SITE_BUILD_VERSIONING.md - Phase 1 console build stamp
 */
import { formatSiteBuildConsoleLine } from "./build-meta-browser.mjs";
import { SITE_BUILD_META } from "./build-meta.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";
import { wireStatusLoadErrorDot } from "./device-status-load-error.mjs";
import { isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";

console.info(formatSiteBuildConsoleLine(SITE_BUILD_META));

const statusModuleUrl = new URL(
  `./device-status.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`,
  import.meta.url
);

import(statusModuleUrl.href)
  .then(() => {
    document.getElementById("top-chrome")?.removeAttribute("data-device-status-error");
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
    }
  })
  .catch((err) => {
    wireStatusLoadErrorDot(err?.message || String(err));
  });

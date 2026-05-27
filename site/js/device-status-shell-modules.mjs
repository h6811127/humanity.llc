/**
 * Static filenames under site/js/ required for device-status bootstrap.
 * Playwright and Vitest share this list - add a file here when merging a new
 * import on the status-dot graph (same PR as the .mjs file).
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md - Phase 1.1
 */

/**
 * Bump on all shell HTML (`device-status-bootstrap.mjs?v=N`) and on every
 * `./peer.mjs?v=N` import between files in DEVICE_STATUS_SHELL_JS_FILES.
 */
export const DEVICE_SHELL_ASSET_VERSION = 49;

/** @deprecated Use DEVICE_SHELL_ASSET_VERSION */
export const DEVICE_STATUS_BOOTSTRAP_CACHE_BUST = DEVICE_SHELL_ASSET_VERSION;

/**
 * Filenames relative to site/js/ (not URLs).
 * Order: bootstrap first, then direct status graph modules.
 */
export const DEVICE_STATUS_SHELL_JS_FILES = [
  "device-status-bootstrap.mjs",
  "device-status.mjs",
  "device-hub-intro-coachmark.mjs",
  "device-dot-state-core.mjs",
  "device-chrome-refresh-core.mjs",
  "device-chrome-refresh.mjs",
  "device-inbox-sheet-loader.mjs",
  "device-inbox-sheet.mjs",
  "device-inbox-sheet-core.mjs",
  "device-inbox-card-disabled.mjs",
  "device-inbox-diagnostics.mjs",
  "device-inbox-diagnostics-core.mjs",
  "device-inbox-core.mjs",
  "device-cross-tab-state-core.mjs",
  "device-cross-tab-state.mjs",
  "device-hub-keys-custody-core.mjs",
  "device-hub-keys-custody.mjs",
  "device-presence-inbox-stability-core.mjs",
  "device-inbox.mjs",
  "device-tab-presence-core.mjs",
  "device-tab-presence.mjs",
  "device-wallet-removed-profiles-core.mjs",
  "device-wallet-removed-profiles.mjs",
  "wallet-page-chrome.mjs",
  "device-hub-ui.mjs",
  "device-steward-entitlements.mjs",
  "device-steward-entitlements-core.mjs",
  "device-steward-quota-core.mjs",
  "device-steward-push.mjs",
  "device-steward-push-core.mjs",
  "device-hub-sheet.mjs",
  "device-hub-sheet-core.mjs",
  "device-sheet-backdrop-sync.mjs",
  "device-browser-notifications.mjs",
  "device-browser-notifications-core.mjs",
];

/**
 * @param {number} [cacheBust]
 * @returns {string[]}
 */
export function deviceStatusShellModulePaths(cacheBust = DEVICE_SHELL_ASSET_VERSION) {
  return DEVICE_STATUS_SHELL_JS_FILES.map((file) => `/js/${file}?v=${cacheBust}`);
}

/**
 * Relative import specifier for graph peers (static import paths must be literals).
 * @param {string} filename e.g. `device-inbox-sheet.mjs`
 * @param {number} [cacheBust]
 * @returns {string}
 */
export function deviceShellGraphImport(filename, cacheBust = DEVICE_SHELL_ASSET_VERSION) {
  return `./${filename}?v=${cacheBust}`;
}

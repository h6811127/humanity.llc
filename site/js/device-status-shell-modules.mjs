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
export const DEVICE_SHELL_ASSET_VERSION = 94;

/** Cache-bust for shell CSS on Pages HTML (keep in sync with asset version bumps). */
export const DEVICE_SHELL_CSS_VERSION = DEVICE_SHELL_ASSET_VERSION;

/** @deprecated Use DEVICE_SHELL_ASSET_VERSION */
export const DEVICE_STATUS_BOOTSTRAP_CACHE_BUST = DEVICE_SHELL_ASSET_VERSION;

/**
 * Filenames relative to site/js/ (not URLs).
 * Order: bootstrap first, then direct status graph modules.
 */
export const DEVICE_STATUS_SHELL_JS_FILES = [
  "device-status-bootstrap.mjs",
  "device-status-bootstrap-inner.mjs",
  "device-status-load-error.mjs",
  "device-status-dot-boot-core.mjs",
  "device-status-dot-boot.mjs",
  "device-status-dot-view-transition-core.mjs",
  "build-meta-browser.mjs",
  "device-resolver-health-boot-core.mjs",
  "device-status-core.mjs",
  "device-status.mjs",
  "device-hub-intro-coachmark.mjs",
  "device-dot-state-core.mjs",
  "device-custody-mode-core.mjs",
  "device-ownership-copy-core.mjs",
  "device-shell-copy-core.mjs",
  "device-emphasis-card-html.mjs",
  "device-ownership-not-in-tab-core.mjs",
  "device-chrome-refresh-core.mjs",
  "device-chrome-refresh.mjs",
  "device-foreground-attention-core.mjs",
  "device-foreground-attention.mjs",
  "device-live-proof-banner.mjs",
  "device-shell-boot-core.mjs",
  "device-hub-boot-core.mjs",
  "device-shell-boot.mjs",
  "device-shell-resume-core.mjs",
  "device-shell-resume.mjs",
  "device-inbox-sheet-loader.mjs",
  "device-hub-sheet-loader.mjs",
  "device-inbox-loader.mjs",
  "device-relay-offer-inbox-loader.mjs",
  "device-relay-offer-inbox-core.mjs",
  "device-notification-delivery.mjs",
  "device-browser-notifications-loader.mjs",
  "device-live-proof-notification-nav.mjs",
  "device-live-proof-notification-nav-core.mjs",
  "device-inbox-sheet.mjs",
  "device-inbox-sheet-core.mjs",
  "device-inbox-card-disabled.mjs",
  "device-inbox-diagnostics.mjs",
  "device-inbox-diagnostics-core.mjs",
  "device-notification-delivery-core.mjs",
  "device-inbox-core.mjs",
  "device-cross-tab-state-core.mjs",
  "device-cross-tab-boot-core.mjs",
  "device-cross-tab-state.mjs",
  "device-legacy-cross-tab-chrome-core.mjs",
  "device-hub-keys-custody-core.mjs",
  "device-hub-keys-custody.mjs",
  "device-presence-inbox-stability-core.mjs",
  "device-quiet-tab-rehydrate-core.mjs",
  "device-quiet-tab-rehydrate-boot-core.mjs",
  "device-quiet-tab-rehydrate-prefs.mjs",
  "device-quiet-tab-rehydrate.mjs",
  "device-quiet-tab-rehydrate-bootstrap.mjs",
  "device-inbox.mjs",
  "device-tab-presence-core.mjs",
  "device-tab-presence.mjs",
  "device-wallet-removed-profiles-core.mjs",
  "device-wallet-removed-profiles.mjs",
  "device-wallet-corrupt-core.mjs",
  "device-pwa-session-mismatch-core.mjs",
  "device-pwa-session-mismatch.mjs",
  "wallet-page-chrome.mjs",
  "device-resolver-sync-core.mjs",
  "device-resolver-sync.mjs",
  "device-live-control-poll-leader-core.mjs",
  "device-live-control-poll-leader.mjs",
  "device-hub-ui.mjs",
  "device-hub-card-row-core.mjs",
  "device-wallet-network-core.mjs",
  "device-wallet-network-truth.mjs",
  "device-wallet-network.mjs",
  "device-hub-build-stamp.mjs",
  "device-hub-wallet-debug-core.mjs",
  "device-steward-entitlements.mjs",
  "device-steward-entitlements-core.mjs",
  "device-steward-session-core.mjs",
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

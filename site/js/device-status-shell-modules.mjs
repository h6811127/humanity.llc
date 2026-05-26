/**
 * Static filenames under site/js/ required for device-status bootstrap.
 * Playwright and Vitest share this list — add a file here when merging a new
 * import on the status-dot graph (same PR as the .mjs file).
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md
 */

/** Bump on all shell HTML when bootstrap query changes. */
export const DEVICE_STATUS_BOOTSTRAP_CACHE_BUST = 21;

/**
 * Filenames relative to site/js/ (not URLs).
 * Order: bootstrap first, then direct status graph modules.
 */
export const DEVICE_STATUS_SHELL_JS_FILES = [
  "device-status-bootstrap.mjs",
  "device-status.mjs",
  "device-dot-state-core.mjs",
  "device-inbox-sheet.mjs",
  "device-inbox-sheet-core.mjs",
  "device-inbox-card-disabled.mjs",
  "device-inbox-diagnostics.mjs",
  "device-inbox-diagnostics-core.mjs",
  "device-inbox-core.mjs",
  "device-inbox.mjs",
  "device-hub-sheet.mjs",
  "device-hub-sheet-core.mjs",
  "device-browser-notifications.mjs",
  "device-browser-notifications-core.mjs",
];

/**
 * @param {number} [cacheBust]
 * @returns {string[]}
 */
export function deviceStatusShellModulePaths(cacheBust = DEVICE_STATUS_BOOTSTRAP_CACHE_BUST) {
  return DEVICE_STATUS_SHELL_JS_FILES.map((file) =>
    file === "device-status-bootstrap.mjs" ? `/js/${file}?v=${cacheBust}` : `/js/${file}`
  );
}

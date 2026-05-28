/**
 * Device shell E2E spec list — single source for CI and local sign-off.
 * @see docs/DEVICE_SHELL_E2E_CI_REMEDIATION.md § Step 4
 */

/** @type {readonly string[]} */
export const DEVICE_SHELL_E2E_SPECS = [
  "e2e/device-status-dot.spec.ts",
  "e2e/device-inbox.spec.ts",
  "e2e/device-os-wallet.spec.ts",
  "e2e/scan-page-dot.spec.ts",
  "e2e/safari-shell-scroll.spec.ts",
  "e2e/scan-cross-tab-banner-webkit.spec.ts",
  "e2e/keys-custody-emphasis-webkit.spec.ts",
  "e2e/merch-funnel-customize.spec.ts",
  "e2e/device-hub-large-wallet-summary.spec.ts",
];

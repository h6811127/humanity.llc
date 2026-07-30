/**
 * Short handoff interstitial `/v/{code}` copy (S6).
 * Kept free of shell-graph `?v=` imports so Worker + Playwright Node loaders can import it.
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S6
 * @see site/js/device-ownership-copy-core.mjs (re-exports)
 */

export const STEWARD_HANDOFF_INTERSTITIAL_EYEBROW = "Steward scan";

export const STEWARD_HANDOFF_INTERSTITIAL_TITLE =
  "Open this scan in your Home Screen app";

export const STEWARD_HANDOFF_INTERSTITIAL_DETAIL =
  "Your camera opened Safari. On iPhone, your steward card lives in the Home Screen app. Not this tab. Copy the scan link below, switch apps, then paste under Open scan link.";

export const STEWARD_HANDOFF_INTERSTITIAL_CONTINUE = "Continue to scan page";

export const STEWARD_HANDOFF_INTERSTITIAL_COPY = "Copy scan link";

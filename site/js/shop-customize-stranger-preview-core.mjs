/**
 * Customize → stranger scan preview handoff (Register A → B).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 3 · V4
 */
import {
  buildStewardScanPreviewHref,
  isAllowedScanPreviewUrl,
  stewardScanOpenedFeedback,
} from "./pwa-scan-handoff-core.mjs";

export const CUSTOMIZE_STRANGER_PREVIEW_CTA_LABEL = "Preview as stranger";

export const CUSTOMIZE_STRANGER_PREVIEW_HINT_BROWSER =
  "Opens the real scan page in a new tab — what finders see, not the mockup.";

export const CUSTOMIZE_STRANGER_PREVIEW_HINT_STANDALONE =
  "Opens the real scan page — use Back to return here.";

/**
 * @param {{ scanUrl?: string | null, previewSettled?: boolean }} input
 */
export function shouldShowCustomizeStrangerPreview(input) {
  if (!input?.previewSettled) return false;
  const scanUrl = input.scanUrl;
  return typeof scanUrl === "string" && isAllowedScanPreviewUrl(scanUrl);
}

/**
 * @param {boolean} standalone
 */
export function customizeStrangerPreviewHint(standalone) {
  return standalone
    ? CUSTOMIZE_STRANGER_PREVIEW_HINT_STANDALONE
    : CUSTOMIZE_STRANGER_PREVIEW_HINT_BROWSER;
}

/**
 * @param {boolean} standalone
 */
export function customizeStrangerPreviewOpenedFeedback(standalone) {
  return stewardScanOpenedFeedback(standalone);
}

/**
 * @param {string} scanUrl
 * @param {{ standalone?: boolean; returnUrl?: string | null; pageOrigin?: string }} opts
 */
export function buildCustomizeStrangerPreviewHref(scanUrl, opts = {}) {
  return buildStewardScanPreviewHref(scanUrl, opts);
}

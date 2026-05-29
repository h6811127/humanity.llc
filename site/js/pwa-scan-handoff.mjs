/**
 * Browser helpers for standalone steward scan preview (return URL + navigation).
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md
 */
import {
  buildStewardScanPreviewHref,
  openStewardScanPreview,
} from "./pwa-scan-handoff-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/**
 * @param {{ returnUrl?: string | null; setupWizard?: boolean }} [opts]
 */
export function stewardScanPreviewContext(opts = {}) {
  const standalone = readStandaloneModeFromWindow(window);
  const pageOrigin = location.origin;
  const returnUrl = opts.returnUrl ?? (standalone ? location.href : null);
  return { standalone, pageOrigin, returnUrl };
}

/**
 * @param {string} scanUrl
 * @param {{ returnUrl?: string | null }} [opts]
 */
export function buildStewardScanPreviewHrefFromWindow(scanUrl, opts = {}) {
  const ctx = stewardScanPreviewContext(opts);
  return buildStewardScanPreviewHref(scanUrl, ctx);
}

/**
 * @param {string} scanUrl
 * @param {{ returnUrl?: string | null; navigation?: { assign?: (href: string) => void } }} [opts]
 */
export function openStewardScanPreviewFromWindow(scanUrl, opts = {}) {
  const ctx = stewardScanPreviewContext(opts);
  return openStewardScanPreview(scanUrl, {
    standalone: ctx.standalone,
    returnUrl: ctx.returnUrl,
    pageOrigin: ctx.pageOrigin,
    navigation: opts.navigation ?? location,
    storage: sessionStorage,
  });
}

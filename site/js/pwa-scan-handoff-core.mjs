/**
 * Standalone-aware steward scan preview navigation.
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md
 */

export const PWA_SCAN_HANDOFF_DOC = "docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md";

/**
 * @param {string} url
 */
export function isAllowedScanPreviewUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} standalone
 */
export function stewardScanOpensInNewTab(standalone) {
  return !standalone;
}

/**
 * HTML attribute fragment for steward scan anchor markup.
 * @param {boolean} standalone
 */
export function stewardScanLinkHtmlAttrs(standalone) {
  return standalone ? "" : ' target="_blank" rel="noopener noreferrer"';
}

/**
 * @param {HTMLAnchorElement | null | undefined} anchor
 * @param {boolean} standalone
 */
export function applyStewardScanLinkElement(anchor, standalone) {
  if (!anchor) return;
  if (standalone) {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
    return;
  }
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
}

/**
 * @param {boolean} standalone
 * @param {{ setupWizard?: boolean }} [opts]
 */
export function stewardScanOpenedFeedback(standalone, opts = {}) {
  if (standalone) {
    return opts.setupWizard
      ? "Opened scan preview — use Back to return here, then continue."
      : "Opened scan preview — use Back to return here.";
  }
  if (opts.setupWizard) {
    return "Opened scan page — check it from another device, then continue.";
  }
  return "Opened scan page in a new tab.";
}

/**
 * Wallet / hub pin list subtitle for scan links.
 * @param {boolean} standalone
 * @param {{ hasQrId?: boolean }} [opts]
 */
export function stewardScanPinListSub(standalone, opts = {}) {
  if (standalone) {
    return opts.hasQrId ? "Scan" : "Card scan";
  }
  return opts.hasQrId ? "Scan · new tab" : "Card scan · new tab";
}

/**
 * Open steward scan preview — same tab in standalone PWA, new tab in browser.
 * @param {string} url
 * @param {{
 *   standalone?: boolean;
 *   navigation?: { assign?: (href: string) => void };
 *   openWindow?: (url: string, target: string, features: string) => Window | null;
 * }} [options]
 * @returns {boolean} false when URL invalid
 */
export function openStewardScanPreview(url, options = {}) {
  const href = typeof url === "string" ? url.trim() : "";
  if (!isAllowedScanPreviewUrl(href)) return false;

  const standalone = Boolean(options.standalone);
  if (standalone) {
    if (typeof options.navigation?.assign === "function") {
      options.navigation.assign(href);
      return true;
    }
    if (typeof globalThis.location?.assign === "function") {
      globalThis.location.assign(href);
      return true;
    }
    return false;
  }

  const openWindow = options.openWindow ?? globalThis.open;
  if (typeof openWindow === "function") {
    openWindow(href, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}

/**
 * Setup wizard: auto-advance past test scan only in browser tabs.
 * @param {boolean} standalone
 */
export function shouldAutoAdvanceSetupTestScan(standalone) {
  return !standalone;
}

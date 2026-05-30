/**
 * Standalone-aware steward scan preview navigation.
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md
 */

import { appendStewardScanQueryParam } from "./scan-pwa-camera-handoff-core.mjs";

export const PWA_SCAN_HANDOFF_DOC = "docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md";

/** Query param on scan URL — steward preview return path (P2). */
export const STEWARD_PREVIEW_RETURN_PARAM = "hc_return";

/** sessionStorage fallback when navigating same-tab in standalone. */
export const STEWARD_PREVIEW_RETURN_STORAGE_KEY = "hc_steward_preview_return";

/** Same-origin paths allowed for steward preview return (pathname prefix). */
export const STEWARD_PREVIEW_RETURN_ALLOWED_PATH_PREFIXES = [
  "/created",
  "/wallet",
  "/create",
  "/shop/customize",
  "/",
];

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
    return "Opened scan preview — use Back to return here.";
  }
  if (opts.setupWizard) {
    return "Opened scan preview in a new tab.";
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
 * @param {string} url
 * @param {string} pageOrigin
 */
export function isAllowedStewardPreviewReturnUrl(url, pageOrigin) {
  if (typeof url !== "string" || !url.trim() || typeof pageOrigin !== "string") {
    return false;
  }
  try {
    const parsed = new URL(url.trim(), pageOrigin);
    if (parsed.origin !== pageOrigin) return false;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const path = parsed.pathname.endsWith("/") && parsed.pathname.length > 1
      ? parsed.pathname
      : parsed.pathname === "/"
        ? "/"
        : parsed.pathname;
    if (path === "/" || path === "/index.html") return true;
    return STEWARD_PREVIEW_RETURN_ALLOWED_PATH_PREFIXES.some(
      (prefix) => prefix !== "/" && path.startsWith(prefix)
    );
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @param {string} pageOrigin
 * @returns {string | null}
 */
export function normalizeStewardPreviewReturnUrl(url, pageOrigin) {
  if (!isAllowedStewardPreviewReturnUrl(url, pageOrigin)) return null;
  try {
    const parsed = new URL(url.trim(), pageOrigin);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * @param {string | URLSearchParams} searchParams
 * @param {string} pageOrigin
 * @returns {string | null} absolute return URL
 */
export function readStewardPreviewReturnFromSearchParams(searchParams, pageOrigin) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(String(searchParams ?? ""));
  const raw = params.get(STEWARD_PREVIEW_RETURN_PARAM)?.trim();
  if (!raw) return null;
  const candidate = raw.startsWith("/") ? `${pageOrigin}${raw}` : raw;
  const normalized = normalizeStewardPreviewReturnUrl(candidate, pageOrigin);
  if (!normalized) return null;
  return `${pageOrigin}${normalized}`;
}

/**
 * @param {string} scanUrl
 * @param {string} returnUrl
 * @param {string} pageOrigin
 */
export function appendStewardPreviewReturnToScanUrl(scanUrl, returnUrl, pageOrigin) {
  const href = typeof scanUrl === "string" ? scanUrl.trim() : "";
  if (!isAllowedScanPreviewUrl(href)) return href;
  const relative = normalizeStewardPreviewReturnUrl(returnUrl, pageOrigin);
  if (!relative) return href;
  try {
    const url = new URL(href);
    url.searchParams.set(STEWARD_PREVIEW_RETURN_PARAM, relative);
    return url.href;
  } catch {
    return href;
  }
}

/**
 * @param {string} returnUrl absolute or same-origin
 */
export function stewardPreviewReturnBannerLabel(returnUrl) {
  try {
    const parsed = new URL(returnUrl);
    const hash = parsed.hash.replace(/^#/, "");
    if (hash === "setup" || hash.startsWith("setup-")) return "Back to setup";
    if (parsed.pathname.startsWith("/shop/customize")) return "Back to customize";
    if (parsed.pathname.startsWith("/wallet")) return "Back to My objects";
    if (parsed.pathname.startsWith("/created")) return "Back to card controls";
    if (parsed.pathname.startsWith("/create")) return "Back to create";
    return "Back";
  } catch {
    return "Back";
  }
}

/**
 * @param {string | null | undefined} returnUrl
 */
export function shouldShowStewardPreviewReturnBanner(returnUrl) {
  return typeof returnUrl === "string" && returnUrl.length > 0;
}

/**
 * @param {string} scanUrl
 * @param {{ standalone?: boolean; returnUrl?: string | null; pageOrigin?: string }} opts
 */
export function buildStewardScanPreviewHref(scanUrl, opts = {}) {
  const href = typeof scanUrl === "string" ? scanUrl.trim() : "";
  if (!isAllowedScanPreviewUrl(href)) return href;
  if (!opts.standalone || !opts.returnUrl) {
    if (!opts.standalone) return appendStewardScanQueryParam(href);
    return href;
  }
  const pageOrigin = opts.pageOrigin ?? "";
  if (!pageOrigin) return href;
  return appendStewardPreviewReturnToScanUrl(href, opts.returnUrl, pageOrigin);
}

/**
 * Persist return path for scan page boot (standalone same-tab).
 * @param {string} returnUrl
 * @param {string} pageOrigin
 * @param {{ setItem?: (key: string, value: string) => void }} [storage]
 */
export function writeStewardPreviewReturnStorage(returnUrl, pageOrigin, storage) {
  const relative = normalizeStewardPreviewReturnUrl(returnUrl, pageOrigin);
  if (!relative) return;
  try {
    (storage?.setItem ?? globalThis.sessionStorage?.setItem)?.call(
      storage ?? globalThis.sessionStorage,
      STEWARD_PREVIEW_RETURN_STORAGE_KEY,
      relative
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} pageOrigin
 * @param {{ getItem?: (key: string) => string | null }} [storage]
 * @returns {string | null}
 */
export function readStewardPreviewReturnStorage(pageOrigin, storage) {
  try {
    const raw = (storage?.getItem ?? globalThis.sessionStorage?.getItem)?.call(
      storage ?? globalThis.sessionStorage,
      STEWARD_PREVIEW_RETURN_STORAGE_KEY
    );
    if (!raw) return null;
    const candidate = raw.startsWith("/") ? `${pageOrigin}${raw}` : raw;
    const normalized = normalizeStewardPreviewReturnUrl(candidate, pageOrigin);
    return normalized ? `${pageOrigin}${normalized}` : null;
  } catch {
    return null;
  }
}

/**
 * Open steward scan preview — same tab in standalone PWA, new tab in browser.
 * @param {string} url
 * @param {{
 *   standalone?: boolean;
 *   returnUrl?: string | null;
 *   pageOrigin?: string;
 *   navigation?: { assign?: (href: string) => void };
 *   openWindow?: (url: string, target: string, features: string) => Window | null;
 *   storage?: { setItem?: (key: string, value: string) => void };
 * }} [options]
 * @returns {boolean} false when URL invalid
 */
export function openStewardScanPreview(url, options = {}) {
  let href = typeof url === "string" ? url.trim() : "";
  if (!isAllowedScanPreviewUrl(href)) return false;

  const standalone = Boolean(options.standalone);
  const pageOrigin =
    options.pageOrigin ??
    (typeof globalThis.location?.origin === "string" ? globalThis.location.origin : "");

  if (standalone && options.returnUrl && pageOrigin) {
    href = appendStewardPreviewReturnToScanUrl(href, options.returnUrl, pageOrigin);
    writeStewardPreviewReturnStorage(options.returnUrl, pageOrigin, options.storage);
  }

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

/**
 * Steward preview return bar on scan pages (PWA P2).
 * @see docs/PWA_STANDALONE_EXTERNAL_NAVIGATION.md § P2
 */
import {
  readStewardPreviewReturnFromSearchParams,
  readStewardPreviewReturnStorage,
  shouldShowStewardPreviewReturnBanner,
  stewardPreviewReturnBannerLabel,
} from "./pwa-scan-handoff-core.mjs";

function resolveStewardPreviewReturnUrl() {
  const origin = location.origin;
  const fromQuery = readStewardPreviewReturnFromSearchParams(location.search, origin);
  if (fromQuery) return fromQuery;
  return readStewardPreviewReturnStorage(origin);
}

function bootStewardPreviewReturnBanner() {
  const banner = document.getElementById("scan-steward-preview-return");
  const link = document.getElementById("scan-steward-preview-return-link");
  if (!banner || !link) return;

  const returnUrl = resolveStewardPreviewReturnUrl();
  if (!shouldShowStewardPreviewReturnBanner(returnUrl)) {
    banner.hidden = true;
    return;
  }

  link.href = returnUrl;
  link.textContent = `\u2190 ${stewardPreviewReturnBannerLabel(returnUrl)}`;
  banner.hidden = false;
}

bootStewardPreviewReturnBanner();

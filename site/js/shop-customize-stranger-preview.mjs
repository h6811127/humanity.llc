/**
 * “Preview as stranger” CTA on /shop/customize/ after preview Settle (V4).
 */
import {
  customizeStrangerPreviewHint,
  customizeStrangerPreviewOpenedFeedback,
  shouldShowCustomizeStrangerPreview,
} from "./shop-customize-stranger-preview-core.mjs";
import { openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

const wrap = document.getElementById("shop-customize-stranger-preview-wrap");
const btn = document.getElementById("shop-customize-stranger-preview");
const hintEl = document.getElementById("shop-customize-stranger-preview-hint");

/** @type {string | null} */
let currentScanUrl = null;
let previewSettled = false;

function syncHintCopy() {
  if (!(hintEl instanceof HTMLElement)) return;
  hintEl.textContent = customizeStrangerPreviewHint(readStandaloneModeFromWindow(window));
}

function updateVisibility() {
  const show = shouldShowCustomizeStrangerPreview({
    scanUrl: currentScanUrl,
    previewSettled,
  });
  if (wrap instanceof HTMLElement) wrap.hidden = !show;
  if (btn instanceof HTMLButtonElement) btn.disabled = !show;
}

/**
 * @param {{ scanUrl?: string | null }} input
 */
export function syncCustomizeStrangerPreview(input) {
  const next =
    typeof input?.scanUrl === "string" && input.scanUrl.trim() ? input.scanUrl.trim() : null;
  currentScanUrl = next;
  updateVisibility();
}

export function resetCustomizeStrangerPreview() {
  currentScanUrl = null;
  previewSettled = false;
  updateVisibility();
}

function showOpenedFeedback() {
  if (!(hintEl instanceof HTMLElement)) return;
  const standalone = readStandaloneModeFromWindow(window);
  const original = customizeStrangerPreviewHint(standalone);
  hintEl.textContent = customizeStrangerPreviewOpenedFeedback(standalone);
  window.setTimeout(() => {
    if (hintEl) hintEl.textContent = original;
  }, 4000);
}

function onPreviewSettled() {
  previewSettled = true;
  updateVisibility();
}

function onStrangerPreviewClick() {
  if (!currentScanUrl) return;
  const opened = openStewardScanPreviewFromWindow(currentScanUrl, {
    returnUrl: location.href,
  });
  if (opened) showOpenedFeedback();
}

if (btn instanceof HTMLButtonElement) {
  btn.addEventListener("click", onStrangerPreviewClick);
}

window.addEventListener("hc-shop-customize-preview-settled", onPreviewSettled);

syncHintCopy();
resetCustomizeStrangerPreview();

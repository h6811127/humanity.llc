/**
 * Show setup wizard vs control tabs on /created/
 * @see docs/CARD_WORKSPACE_UX.md
 */

import { createdControlRootVisibleForMode } from "./created-view-mode-core.mjs";

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {CreatedMode} mode
 * @returns {string}
 */
export function createdHeroTitleForMode(mode) {
  if (mode === "setup") return "Set up your live QR";
  if (mode === "view") return "View this card";
  return "Your object is live";
}

/**
 * @param {CreatedMode} mode
 */
export function applyCreatedWorkspaceMode(mode) {
  document.body.dataset.createdMode = mode;

  const setupRoot = document.getElementById("created-setup-root");
  const controlRoot = document.getElementById("created-control-root");
  const heroTitle = document.querySelector(".created-hero-title");

  if (setupRoot) setupRoot.hidden = mode !== "setup";
  if (controlRoot) controlRoot.hidden = !createdControlRootVisibleForMode(mode);

  if (heroTitle) {
    heroTitle.textContent = createdHeroTitleForMode(mode);
  }
}

/**
 * Remove `fresh=1` from the URL after setup completes.
 */
export function clearFreshUrlParam() {
  const url = new URL(location.href);
  if (!url.searchParams.has("fresh")) return;
  url.searchParams.delete("fresh");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Move keys strip back into the Live custody panel after setup. */
export function restoreKeysStripToControlPanel() {
  const keysStrip = document.getElementById("created-keys-strip");
  const custodyPanel = document.getElementById("created-custody-panel");
  if (!keysStrip || !custodyPanel) return;
  if (keysStrip.parentElement !== custodyPanel) {
    custodyPanel.prepend(keysStrip);
  }
}

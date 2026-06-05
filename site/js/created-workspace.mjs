/**
 * Show setup wizard vs control tabs on /created/
 * @see docs/CARD_WORKSPACE_UX.md
 */

import { createdControlRootVisibleForMode } from "./created-view-mode-core.mjs";
import { setupManageTabHintVisible } from "./created-workspace-manage-visibility-core.mjs";
import { controlHeroTitle } from "./created-fresh-presentation-core.mjs";

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {CreatedMode} mode
 * @returns {string}
 */
export function createdHeroTitleForMode(mode) {
  if (mode === "setup") return "Set up your live QR";
  if (mode === "view") return "View this card";
  return controlHeroTitle("account");
}

/**
 * @param {CreatedMode} mode
 * @param {{ title?: string; lead?: string } | null} [heroOverride]
 */
export function applyCreatedWorkspaceMode(mode, heroOverride = null) {
  document.body.dataset.createdMode = mode;

  const setupRoot = document.getElementById("created-setup-root");
  const controlRoot = document.getElementById("created-control-root");
  const heroTitle = document.querySelector(".created-hero-title");
  const heroMeta = document.getElementById("created-hero-meta");

  if (setupRoot) setupRoot.hidden = mode !== "setup";
  if (controlRoot) controlRoot.hidden = !createdControlRootVisibleForMode(mode);

  const manageHint = document.getElementById("created-setup-manage-hint");
  if (manageHint) manageHint.hidden = !setupManageTabHintVisible(mode);

  if (heroTitle) {
    heroTitle.textContent = heroOverride?.title ?? createdHeroTitleForMode(mode);
  }
  if (heroMeta && heroOverride?.lead) {
    heroMeta.textContent = heroOverride.lead;
    heroMeta.hidden = false;
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

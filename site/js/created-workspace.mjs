/**
 * Show setup wizard vs control tabs on /created/
 * @see docs/CARD_WORKSPACE_UX.md
 */

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {CreatedMode} mode
 */
export function applyCreatedWorkspaceMode(mode) {
  document.body.dataset.createdMode = mode;

  const setupRoot = document.getElementById("created-setup-root");
  const controlRoot = document.getElementById("created-control-root");
  const heroTitle = document.querySelector(".created-hero-title");

  if (setupRoot) setupRoot.hidden = mode !== "setup";
  if (controlRoot) controlRoot.hidden = mode !== "control";

  if (heroTitle) {
    heroTitle.textContent =
      mode === "setup" ? "Set up your live QR" : "Live QR ready";
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

/** Move keys strip back into the control Tasks panel after setup. */
export function restoreKeysStripToControlPanel() {
  const keysStrip = document.getElementById("created-keys-strip");
  const tabNow = document.getElementById("created-tab-now");
  const dashboard = tabNow?.querySelector(".created-dashboard");
  if (!keysStrip || !dashboard) return;
  const networkDetails = tabNow?.querySelector(
    ".created-advanced-block:not(.created-recovery-details)"
  );
  if (networkDetails) {
    tabNow.insertBefore(keysStrip, networkDetails);
  } else {
    dashboard.after(keysStrip);
  }
}

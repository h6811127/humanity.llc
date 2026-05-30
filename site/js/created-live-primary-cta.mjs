/**
 * DOM sync for Live tab contextual primary CTA.
 */

import { isWalletSaved } from "./device-wallet.mjs";
import { isAutoSaveEnabled, isAutoSaveFailed } from "./device-auto-save.mjs";
import { resolveCreatedLivePrimaryCta } from "./created-live-primary-cta-core.mjs";

const DONE_STORAGE_KEY = "hc_created_task_done";

/** @param {string | null | undefined} profileId */
function testScanDone(profileId) {
  if (!profileId) return false;
  try {
    const all = JSON.parse(sessionStorage.getItem(DONE_STORAGE_KEY) || "{}");
    const list = all[profileId];
    return Array.isArray(list) && list.includes("test-scan");
  } catch {
    return false;
  }
}

/**
 * @param {{
 *   getProfileId?: () => string | null,
 *   hasSigningKeys?: () => boolean,
 *   resolverReachable?: () => boolean,
 *   scanUrlReady?: () => boolean,
 *   onMode: (mode: string) => void,
 * }} opts
 */
export function initCreatedLivePrimaryCta(opts) {
  const btn = document.getElementById("created-live-primary-btn");
  const subEl = document.getElementById("created-live-primary-sub");
  if (!btn) return { sync: () => {} };

  function collectInput() {
    const profileId = opts.getProfileId?.() ?? null;
    const panel = document.getElementById("live-control-proof");
    const liveProofPending = !!(
      panel &&
      !panel.hidden &&
      panel.classList.contains("live-control-proof-requested")
    );
    const hasSigningKeys = opts.hasSigningKeys?.() ?? false;
    const openScan = document.getElementById("open-scan");
    const scanHref = openScan?.getAttribute("href") ?? "";
    const scanUrlReady =
      opts.scanUrlReady?.() ??
      !!(scanHref && scanHref.startsWith("http"));

    return {
      liveProofPending,
      hasSigningKeys,
      walletSaved: !!(profileId && isWalletSaved(profileId)),
      resolverReachable: opts.resolverReachable?.() ?? true,
      testScanDone: testScanDone(profileId),
      scanUrlReady,
      autoSaveEnabled: isAutoSaveEnabled(),
      autoSaveFailed: !!(profileId && isAutoSaveFailed(profileId)),
    };
  }

  function sync() {
    const mode = document.body.dataset.createdMode;
    if (mode !== "control" && mode !== "view") {
      btn.hidden = true;
      if (subEl) subEl.hidden = true;
      return;
    }

    const input = collectInput();
    const cta = resolveCreatedLivePrimaryCta(
      mode === "view"
        ? {
            ...input,
            hasSigningKeys: false,
            liveProofPending: false,
          }
        : input
    );
    btn.hidden = false;
    btn.textContent = cta.label;
    btn.dataset.livePrimaryMode = cta.mode;
    if (subEl) {
      subEl.textContent = cta.subtitle;
      subEl.hidden = !cta.subtitle;
    }
  }

  btn.addEventListener("click", () => {
    const mode = btn.dataset.livePrimaryMode;
    if (mode) opts.onMode(mode);
  });

  window.addEventListener("hc-created-live-cta-sync", sync);
  window.addEventListener("hc-device-hub-changed", sync);
  window.addEventListener("hc-auto-save-changed", sync);

  sync();
  return { sync };
}

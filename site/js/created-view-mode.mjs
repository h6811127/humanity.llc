/**
 * Apply read-only /created/ workspace chrome when keys are not in this tab (K1).
 * @see docs/CORE_PRODUCT_LOOP.md § View-only deprecation
 */

import {
  viewOnlyLiveTabLead,
  viewOnlyLiveTabTitle,
  viewOnlyManageTabLead,
  viewOnlyWalletBranch,
} from "./created-view-only-copy-core.mjs";
import {
  CREATED_VIEW_LIVE_PROOF_ID,
  CREATED_VIEW_LIVE_SIGNING_ONLY_IDS,
} from "./created-view-live-core.mjs";
import {
  applyCreatedViewLiveReadonlyUi,
  clearCreatedViewLiveReadonlyUi,
} from "./created-view-live-readonly.mjs";

/**
 * Show K1 view-only chrome (recovery import on Manage; no restore-in-tab CTAs).
 * @param {{ signingKeyCount?: number, needsDeviceUnlock?: boolean }} [opts]
 */
export function applyCreatedViewModeUi(opts = {}) {
  const signingKeyCount = opts.signingKeyCount ?? 0;
  const needsDeviceUnlock = opts.needsDeviceUnlock ?? false;
  if (typeof document === "undefined") return;
  document.body.dataset.createdMode = "view";

  const walletSaved = viewOnlyWalletBranch(signingKeyCount) === "wallet_saved";

  const controlLead = document.getElementById("created-control-manage-lead");
  const viewLead = document.getElementById("created-view-manage-lead");
  if (controlLead) controlLead.hidden = true;
  if (viewLead) {
    viewLead.hidden = false;
    viewLead.textContent = viewOnlyManageTabLead(signingKeyCount, needsDeviceUnlock);
  }

  for (const el of document.querySelectorAll("[data-created-signing-only]")) {
    el.hidden = true;
  }

  const liveBanner = document.getElementById("created-view-live-banner");
  const liveTitle = document.getElementById("created-view-live-title");
  const liveLead = document.getElementById("created-view-live-lead");
  if (liveBanner) {
    liveBanner.hidden = walletSaved;
    if (!walletSaved) {
      liveBanner.classList.remove("hc-emphasis-card--warn");
      liveBanner.classList.add("hc-emphasis-card--info");
      const dot = liveBanner.querySelector(".hc-emphasis-card__dot");
      if (dot) {
        dot.className = "hc-emphasis-card__dot hc-emphasis-card__dot--info";
      }
    }
  }
  if (!walletSaved) {
    if (liveTitle) liveTitle.textContent = viewOnlyLiveTabTitle(signingKeyCount);
    if (liveLead) liveLead.textContent = viewOnlyLiveTabLead(signingKeyCount);
  }

  for (const id of CREATED_VIEW_LIVE_SIGNING_ONLY_IDS) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  const liveProof = document.getElementById(CREATED_VIEW_LIVE_PROOF_ID);
  if (liveProof) liveProof.hidden = true;

  const networkDetails = document.getElementById("revoke-details");
  if (networkDetails instanceof HTMLDetailsElement) {
    networkDetails.removeAttribute("hidden");
    networkDetails.open = true;
  }

  if (location.hash.replace(/^#/, "") === "backup") {
    const backupDetails = document.getElementById("backup-details");
    if (backupDetails instanceof HTMLDetailsElement) backupDetails.open = true;
  }

  applyCreatedViewLiveReadonlyUi();
}

/** Restore signing UI after keys load into this tab. */
export function clearCreatedViewModeUi() {
  if (typeof document === "undefined") return;

  const controlLead = document.getElementById("created-control-manage-lead");
  const viewLead = document.getElementById("created-view-manage-lead");
  if (controlLead) controlLead.hidden = false;
  if (viewLead) viewLead.hidden = true;

  for (const el of document.querySelectorAll("[data-created-signing-only]")) {
    el.hidden = false;
  }

  const liveBanner = document.getElementById("created-view-live-banner");
  if (liveBanner) {
    liveBanner.hidden = true;
    liveBanner.classList.remove("hc-emphasis-card--warn");
    liveBanner.classList.add("hc-emphasis-card--info");
  }

  for (const id of CREATED_VIEW_LIVE_SIGNING_ONLY_IDS) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  clearCreatedViewLiveReadonlyUi();
}

/**
 * @param {(tabId: string) => void} selectTab
 */
export function focusCreatedViewRestore(selectTab) {
  selectTab("advanced");
  requestAnimationFrame(() => {
    document.getElementById("created-view-restore-tools")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

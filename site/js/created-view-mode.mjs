/**
 * Apply read-only /created/ workspace chrome when keys are not in this tab.
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0-7
 */

import { OWNERSHIP_NOT_LOADED_TAB } from "./device-ownership-copy-core.mjs";
import {
  viewOnlyLiveTabLead,
  viewOnlyManageTabLead,
  viewOnlyRestoreLead,
} from "./created-view-only-copy-core.mjs";
import {
  CREATED_VIEW_LIVE_PROOF_ID,
  CREATED_VIEW_LIVE_SIGNING_ONLY_IDS,
} from "./created-view-live-core.mjs";

/**
 * Show restore panel and hide signing-only controls.
 * @param {{ signingKeyCount?: number }} [opts]
 */
export function applyCreatedViewModeUi(opts = {}) {
  const signingKeyCount = opts.signingKeyCount ?? 0;
  if (typeof document === "undefined") return;
  document.body.dataset.createdMode = "view";

  const restorePanel = document.getElementById("created-view-restore-panel");
  if (restorePanel) restorePanel.hidden = false;

  const controlLead = document.getElementById("created-control-manage-lead");
  const viewLead = document.getElementById("created-view-manage-lead");
  if (controlLead) controlLead.hidden = true;
  if (viewLead) {
    viewLead.hidden = false;
    viewLead.textContent = viewOnlyManageTabLead(signingKeyCount);
  }

  const restoreLead = document.getElementById("created-view-restore-lead");
  if (restoreLead) restoreLead.textContent = viewOnlyRestoreLead(signingKeyCount);

  const ownershipHint = document.getElementById("created-view-ownership-hint");
  if (ownershipHint) ownershipHint.textContent = OWNERSHIP_NOT_LOADED_TAB;

  for (const el of document.querySelectorAll("[data-created-signing-only]")) {
    el.hidden = true;
  }

  const liveBanner = document.getElementById("created-view-live-banner");
  const liveLead = document.getElementById("created-view-live-lead");
  if (liveBanner) liveBanner.hidden = false;
  if (liveLead) liveLead.textContent = viewOnlyLiveTabLead(signingKeyCount);

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
}

/** Restore signing UI after keys load into this tab. */
export function clearCreatedViewModeUi() {
  if (typeof document === "undefined") return;

  const restorePanel = document.getElementById("created-view-restore-panel");
  if (restorePanel) restorePanel.hidden = true;

  const controlLead = document.getElementById("created-control-manage-lead");
  const viewLead = document.getElementById("created-view-manage-lead");
  if (controlLead) controlLead.hidden = false;
  if (viewLead) viewLead.hidden = true;

  for (const el of document.querySelectorAll("[data-created-signing-only]")) {
    el.hidden = false;
  }

  const liveBanner = document.getElementById("created-view-live-banner");
  if (liveBanner) liveBanner.hidden = true;

  for (const id of CREATED_VIEW_LIVE_SIGNING_ONLY_IDS) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }
}

/**
 * @param {(tabId: string) => void} selectTab
 */
export function focusCreatedViewRestore(selectTab) {
  selectTab("advanced");
  requestAnimationFrame(() => {
    document.getElementById("created-view-restore-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

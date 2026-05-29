/**
 * Apply read-only /created/ workspace chrome when keys are not in this tab.
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

import {
  OWNERSHIP_NOT_LOADED_TAB,
  VIEW_ONLY_MANAGE_TAB_LEAD,
  VIEW_ONLY_RESTORE_LEAD,
} from "./device-ownership-copy-core.mjs";

/**
 * Show restore panel and hide signing-only controls.
 */
export function applyCreatedViewModeUi() {
  if (typeof document === "undefined") return;
  document.body.dataset.createdMode = "view";

  const restorePanel = document.getElementById("created-view-restore-panel");
  if (restorePanel) restorePanel.hidden = false;

  const controlLead = document.getElementById("created-control-manage-lead");
  const viewLead = document.getElementById("created-view-manage-lead");
  if (controlLead) controlLead.hidden = true;
  if (viewLead) {
    viewLead.hidden = false;
    viewLead.textContent = VIEW_ONLY_MANAGE_TAB_LEAD;
  }

  const restoreLead = document.getElementById("created-view-restore-lead");
  if (restoreLead) restoreLead.textContent = VIEW_ONLY_RESTORE_LEAD;

  const ownershipHint = document.getElementById("created-view-ownership-hint");
  if (ownershipHint) ownershipHint.textContent = OWNERSHIP_NOT_LOADED_TAB;

  for (const el of document.querySelectorAll("[data-created-signing-only]")) {
    el.hidden = true;
  }

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

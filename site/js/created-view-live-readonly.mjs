/**
 * View-mode Live tab: read-only QR/signage below object card (Phase 3).
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

import { VIEW_ONLY_LIVE_QR_TASKS_LEAD } from "./device-ownership-copy-core.mjs";
import { openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/**
 * @param {{ getScanUrl?: () => string | null }} opts
 */
export function initCreatedViewLiveReadonly(opts) {
  const panel = document.getElementById("created-view-live-qr-tasks");
  const lead = document.getElementById("created-view-live-qr-tasks-lead");
  const openBtn = document.getElementById("created-view-open-scan");
  const copyBtn = document.getElementById("created-view-copy-scan");

  if (lead) lead.textContent = VIEW_ONLY_LIVE_QR_TASKS_LEAD;

  function sync() {
    const url = opts.getScanUrl?.();
    const ok = !!url && url.startsWith("http");
    if (openBtn) openBtn.disabled = !ok;
    if (copyBtn) copyBtn.disabled = !ok;
  }

  openBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    const url = opts.getScanUrl?.();
    if (!url?.startsWith("http")) return;
    const standalone = readStandaloneModeFromWindow(window);
    if (!openStewardScanPreviewFromWindow(url, { setupWizard: false })) {
      window.open(url, standalone ? "_self" : "_blank", "noopener,noreferrer");
    }
  });

  copyBtn?.addEventListener("click", () => {
    const url = opts.getScanUrl?.();
    if (url?.startsWith("http")) void navigator.clipboard.writeText(url);
  });

  window.addEventListener("hc-created-qr-ready", sync);
  sync();
  return { sync };
}

/** Hide signing Live tab blocks; show read-only QR tasks. */
export function applyCreatedViewLiveReadonlyUi() {
  for (const el of document.querySelectorAll("[data-created-live-signing-only]")) {
    el.hidden = true;
  }
  const panel = document.getElementById("created-view-live-qr-tasks");
  if (panel) panel.hidden = false;
}

/** Restore control-mode Live tab chrome. */
export function clearCreatedViewLiveReadonlyUi() {
  const panel = document.getElementById("created-view-live-qr-tasks");
  if (panel) panel.hidden = true;
  for (const el of document.querySelectorAll("[data-created-live-signing-only]")) {
    el.hidden = false;
  }
}

import { readChildObjectRows } from "./child-object-store-core.mjs";
import {
  childObjectBackupGateNoticeCopy,
  childObjectBackupGateState,
  countActiveChildObjects,
  rootHasChildObjectBackupSeatbelt,
} from "./child-object-backup-gate-core.mjs";

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 *   noticeId: string;
 *   submitId: string;
 * }} ctx
 */
export function syncChildObjectBackupGateUi(ctx) {
  const noticeEl = document.getElementById(ctx.noticeId);
  const submitEl = document.getElementById(ctx.submitId);
  const rows = readChildObjectRows(localStorage, ctx.profileId);
  const gate = childObjectBackupGateState({
    activeCount: countActiveChildObjects(rows),
    hasSeatbelt: rootHasChildObjectBackupSeatbelt(ctx.getSession()),
  });
  const copy = childObjectBackupGateNoticeCopy(gate);

  if (noticeEl) {
    if (!copy) {
      noticeEl.hidden = true;
      noticeEl.replaceChildren();
    } else {
      noticeEl.hidden = false;
      noticeEl.classList.toggle("hc-notice--warning", gate.warn);
      noticeEl.classList.toggle("hc-notice--error", gate.blocked);
      noticeEl.innerHTML = `
        <span class="hc-notice-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
        </span>
        <div class="hc-notice-content">
          <p class="hc-notice-title">${escapeHtml(copy.title)}</p>
          <p class="hc-notice-body">${escapeHtml(copy.body)}</p>
          <div class="hc-notice-actions">
            <a class="btn-secondary" href="#advanced">Open Manage backup</a>
          </div>
        </div>`;
    }
  }

  if (submitEl instanceof HTMLButtonElement) {
    submitEl.disabled = gate.blocked;
    submitEl.setAttribute("aria-disabled", gate.blocked ? "true" : "false");
  }

  return gate;
}

/**
 * @param {{
 *   profileId: string;
 *   getSession: () => Record<string, unknown> | null;
 * }} ctx
 */
export function assertChildObjectBackupGateAllowsCreate(ctx) {
  const rows = readChildObjectRows(localStorage, ctx.profileId);
  const gate = childObjectBackupGateState({
    activeCount: countActiveChildObjects(rows),
    hasSeatbelt: rootHasChildObjectBackupSeatbelt(ctx.getSession()),
  });
  if (!gate.allowed) {
    const copy = childObjectBackupGateNoticeCopy(gate);
    throw new Error(copy?.body ?? "Save backup or recovery key before adding another object.");
  }
  return gate;
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

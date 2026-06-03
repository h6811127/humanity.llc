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
 *   context?: 'default' | 'game_season';
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
  const copy = childObjectBackupGateNoticeCopy(gate, { context: ctx.context });

  if (noticeEl) {
    if (!copy) {
      noticeEl.hidden = true;
      noticeEl.classList.remove("hc-notice--warning", "hc-notice--error");
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
            <a class="btn-secondary child-object-backup-gate-manage-link" href="#advanced">Add recovery method</a>
          </div>
        </div>`;
      noticeEl.querySelector(".child-object-backup-gate-manage-link")?.addEventListener(
        "click",
        onChildObjectBackupGateManageClick
      );
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
export function assertChildObjectBackupGateAllowsCreate(ctx, opts = {}) {
  const adding = opts.adding ?? 1;
  const rows = readChildObjectRows(localStorage, ctx.profileId);
  const gate = childObjectBackupGateState({
    activeCount: countActiveChildObjects(rows),
    hasSeatbelt: rootHasChildObjectBackupSeatbelt(ctx.getSession()),
    adding,
  });
  if (!gate.allowed) {
    const copy = childObjectBackupGateNoticeCopy(gate);
    throw new Error(copy?.body ?? "Save backup or recovery key before adding another object.");
  }
  return gate;
}

/** @param {Event} event */
function onChildObjectBackupGateManageClick(event) {
  event.preventDefault();
  document.getElementById("created-tab-btn-advanced")?.click();
  window.requestAnimationFrame(() => {
    const recovery = document.getElementById("created-recovery-details");
    const backup = document.getElementById("backup-details");
    const target =
      recovery instanceof HTMLElement && !recovery.hidden ? recovery : backup;
    if (target instanceof HTMLElement) {
      if (target.tagName === "DETAILS") {
        target.removeAttribute("hidden");
        target.setAttribute("open", "");
      }
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    document.getElementById("created-tab-advanced")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

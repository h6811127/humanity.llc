/**
 * Backup nudge UI for Tier 1 merch surfaces.
 */
import {
  loadRootSessionRecordForMerch,
  merchBackupNudgeCopy,
  merchPreCheckoutRecoveryGateState,
  shouldShowMerchBackupNudge,
} from "./merch-backup-nudge-core.mjs";

/**
 * @param {{
 *   noticeId: string;
 *   phase: "pre_checkout" | "post_checkout";
 *   enabled?: boolean;
 *   blocked?: boolean;
 *   getSession?: () => Record<string, unknown> | null;
 *   manageHref?: string;
 * }} opts
 */
export function syncMerchBackupNudgeNotice(opts) {
  const noticeEl = document.getElementById(opts.noticeId);
  if (!(noticeEl instanceof HTMLElement)) {
    return { shown: false, blocked: false };
  }

  const enabled = opts.enabled !== false;
  const session = opts.getSession?.() ?? loadRootSessionRecordForMerch();
  const gate =
    opts.phase === "pre_checkout"
      ? merchPreCheckoutRecoveryGateState(session)
      : { blocked: false, shown: shouldShowMerchBackupNudge(session) };
  const blocked = opts.blocked === true || gate.blocked;
  const shown = enabled && (gate.shown || shouldShowMerchBackupNudge(session));

  if (!shown) {
    noticeEl.hidden = true;
    noticeEl.replaceChildren();
    return { shown: false, blocked: false };
  }

  const copy = merchBackupNudgeCopy(opts.phase, { blocked });
  const manageHref = opts.manageHref || "/created/#advanced";
  noticeEl.hidden = false;
  noticeEl.className = `hc-notice shop-merch-backup-nudge ${
    blocked ? "hc-notice--error" : "hc-notice--warning"
  }`;
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
        <a class="btn-secondary" href="${escapeHtml(manageHref)}">Add recovery method</a>
      </div>
    </div>`;
  return { shown: true, blocked };
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * /create/ pre-submit trust stack UI (P0 — progressive disclosure).
 * @see docs/CUSTODY_RECOVERY_MANDATORY_QA.md · device-custody-create-core.mjs
 */

import {
  CREATE_CUSTODY_SUMMARY,
  CREATE_RECOVERY_HINT_DEVICE_UNLOCK,
  CREATE_RECOVERY_HINT_FULL_KEYS,
  CREATE_RECOVERY_LABEL_DEVICE_UNLOCK,
  CREATE_RECOVERY_LABEL_FULL_KEYS,
} from "./device-ownership-copy-core.mjs";

/**
 * @param {{ recoveryMandatory?: boolean }} panel
 */
export function syncCreateRecoveryUi(panel) {
  const cb = document.getElementById("generate-recovery");
  const label = document.getElementById("create-recovery-label");
  const hint = document.getElementById("create-recovery-hint");
  if (!(cb instanceof HTMLInputElement) || !label || !hint) return;

  if (panel.recoveryMandatory) {
    cb.checked = true;
    cb.disabled = true;
    label.textContent = CREATE_RECOVERY_LABEL_DEVICE_UNLOCK;
    hint.textContent = CREATE_RECOVERY_HINT_DEVICE_UNLOCK;
    return;
  }

  cb.disabled = false;
  label.textContent = CREATE_RECOVERY_LABEL_FULL_KEYS;
  hint.textContent = CREATE_RECOVERY_HINT_FULL_KEYS;
}

/**
 * @param {string} [summaryText]
 */
export function syncCreateCustodySummary(summaryText = CREATE_CUSTODY_SUMMARY) {
  const summary = document.getElementById("create-custody-mode-summary");
  if (summary) summary.textContent = summaryText;
}

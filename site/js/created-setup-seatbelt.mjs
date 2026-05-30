/**
 * Setup wizard protect step — recovery ack or encrypted backup before Live.
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md · docs/CARD_WORKSPACE_UX.md
 */

import {
  createEncryptedBackup,
  downloadBackupFile,
  MIN_PASSPHRASE_LENGTH,
  normalizePassphrase,
} from "./key-backup.mjs";
import { rootHasChildObjectBackupSeatbelt } from "./child-object-backup-gate-core.mjs";
import {
  SETUP_SEATBELT_BACKUP_HINT,
  SETUP_SEATBELT_BLOCK_CONTINUE,
  SETUP_SEATBELT_PANEL_LEAD,
  SETUP_SEATBELT_RECOVERY_HINT,
  SETUP_SEATBELT_RECOVERY_SAVED_STATUS,
} from "./device-ownership-copy-core.mjs";

export { rootHasChildObjectBackupSeatbelt as setupOwnershipSeatbeltSatisfied };

/**
 * @param {{
 *   profileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   onSeatbeltChange?: () => void,
 * }} opts
 */
export function initCreatedSetupSeatbelt(opts) {
  const leadEl = document.getElementById("created-setup-seatbelt-lead");
  const recoveryBlock = document.getElementById("created-setup-seatbelt-recovery");
  const recoveryDisplay = document.getElementById("created-setup-recovery-key-display");
  const recoveryConfirm = document.getElementById("created-setup-recovery-reveal-confirm");
  const recoveryDismiss = document.getElementById("created-setup-recovery-reveal-dismiss");
  const copyRecoveryBtn = document.getElementById("created-setup-copy-recovery");
  const recoveryStatus = document.getElementById("created-setup-recovery-status");
  const backupHint = document.getElementById("created-setup-seatbelt-backup-hint");
  const exportForm = document.getElementById("created-setup-export-backup-form");
  const exportStatus = document.getElementById("created-setup-export-backup-status");

  if (leadEl) leadEl.textContent = SETUP_SEATBELT_PANEL_LEAD;
  if (backupHint) backupHint.textContent = SETUP_SEATBELT_BACKUP_HINT;

  function notify() {
    opts.onSeatbeltChange?.();
  }

  function setRecoveryStatus(msg, isError = false) {
    if (!recoveryStatus) return;
    recoveryStatus.hidden = !msg;
    recoveryStatus.textContent = msg;
    recoveryStatus.className = isError ? "form-status error" : "form-status";
  }

  function setExportStatus(msg, isError = false) {
    if (!exportStatus) return;
    exportStatus.hidden = !msg;
    exportStatus.textContent = msg;
    exportStatus.className = isError ? "form-status error" : "form-status";
  }

  function syncRecoveryBlock() {
    const session = opts.getSession();
    const hasRecovery = !!session?.recovery_private_key_b58;
    if (recoveryBlock) recoveryBlock.hidden = !hasRecovery;
    if (hasRecovery && recoveryDisplay) {
      recoveryDisplay.textContent = String(session.recovery_private_key_b58);
    }
    const hint = document.getElementById("created-setup-seatbelt-recovery-hint");
    if (hint) hint.textContent = SETUP_SEATBELT_RECOVERY_HINT;
  }

  syncRecoveryBlock();

  copyRecoveryBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    const text = recoveryDisplay?.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyRecoveryBtn.textContent = "Copied";
      window.setTimeout(() => {
        copyRecoveryBtn.textContent = "Copy recovery code";
      }, 2000);
    } catch {
      copyRecoveryBtn.textContent = "Select and copy manually";
    }
  });

  recoveryDismiss?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!recoveryConfirm?.checked) {
      setRecoveryStatus("Check the box after you save the recovery code.", true);
      recoveryConfirm?.focus();
      return;
    }
    const s = opts.getSession() || {};
    opts.setSession({ ...s, recovery_key_acknowledged: true });
    setRecoveryStatus(SETUP_SEATBELT_RECOVERY_SAVED_STATUS);
    window.dispatchEvent(new CustomEvent("hc-recovery-acknowledged"));
    notify();
  });

  exportForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const session = opts.getSession();
    if (!session?.owner_private_key_b58 || !session?.owner_public_key_b58) {
      setExportStatus("Create and save ownership in this tab first.", true);
      return;
    }
    const fd = new FormData(exportForm);
    const p1 = normalizePassphrase(String(fd.get("passphrase") ?? ""));
    const p2 = normalizePassphrase(String(fd.get("passphrase_confirm") ?? ""));
    if (p1.length < MIN_PASSPHRASE_LENGTH) {
      setExportStatus(
        `Use at least ${MIN_PASSPHRASE_LENGTH} characters for the backup passphrase.`,
        true
      );
      return;
    }
    if (p1 !== p2) {
      setExportStatus("Passphrases do not match.", true);
      return;
    }
    const btn = exportForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    setExportStatus("Encrypting…");
    try {
      const backup = await createEncryptedBackup({
        profileId: String(session.profile_id || opts.profileId),
        publicKeyBase58: String(session.owner_public_key_b58),
        privateKeyBase58: String(session.owner_private_key_b58),
        passphrase: p1,
      });
      downloadBackupFile(backup);
      opts.setSession({
        ...session,
        key_backup_exported_at: new Date().toISOString(),
      });
      window.dispatchEvent(new CustomEvent("hc-key-backup-exported"));
      setExportStatus(
        "Downloaded. Store the file safely; humanity.llc cannot reset your passphrase."
      );
      exportForm.reset();
      notify();
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : "Could not create backup.", true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  window.addEventListener("hc-recovery-acknowledged", notify);
  window.addEventListener("hc-key-backup-exported", notify);

  return {
    refresh: syncRecoveryBlock,
    seatbeltSatisfied: () => setupOwnershipSeatbeltSatisfied(opts.getSession()),
    blockMessage: () => SETUP_SEATBELT_BLOCK_CONTINUE,
  };
}

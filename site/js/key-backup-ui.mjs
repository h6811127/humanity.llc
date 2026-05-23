/**
 * Export / import UI for encrypted owner key backup (M5.5).
 */
import {
  createEncryptedBackup,
  decryptBackup,
  downloadBackupFile,
  MIN_PASSPHRASE_LENGTH,
  readBackupFile,
} from "./key-backup.mjs";

/**
 * @param {{
 *   profileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   onKeysUnlocked: () => void,
 *   showError: (msg: string) => void,
 * }} opts
 */
export function initKeyBackupUi(opts) {
  const exportPanel = document.getElementById("key-export-panel");
  const importPanel = document.getElementById("key-import-panel");
  const exportPass = document.getElementById("export-passphrase");
  const exportPass2 = document.getElementById("export-passphrase-confirm");
  const exportBtn = document.getElementById("export-backup-btn");
  const exportStatus = document.getElementById("export-backup-status");
  const importFile = document.getElementById("import-backup-file");
  const importPass = document.getElementById("import-passphrase");
  const importBtn = document.getElementById("import-backup-btn");
  const importStatus = document.getElementById("import-backup-status");

  function setStatus(el, msg, isError = false) {
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg;
    el.className = isError ? "form-status error" : "form-status";
  }

  function sessionKeys() {
    const s = opts.getSession();
    if (!s?.owner_private_key_b58 || !s?.owner_public_key_b58) return null;
    return {
      profileId: String(s.profile_id || opts.profileId),
      publicKeyBase58: String(s.owner_public_key_b58),
      privateKeyBase58: String(s.owner_private_key_b58),
    };
  }

  const keys = sessionKeys();
  if (exportPanel) {
    exportPanel.hidden = !keys;
  }
  if (importPanel) {
    importPanel.hidden = false;
  }

  exportBtn?.addEventListener("click", async () => {
    const k = sessionKeys();
    if (!k) {
      opts.showError("No signing key in this session. Create a card first.");
      return;
    }
    const p1 = exportPass?.value ?? "";
    const p2 = exportPass2?.value ?? "";
    if (p1.length < MIN_PASSPHRASE_LENGTH) {
      setStatus(exportStatus, `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`, true);
      return;
    }
    if (p1 !== p2) {
      setStatus(exportStatus, "Passphrases do not match.", true);
      return;
    }
    exportBtn.disabled = true;
    setStatus(exportStatus, "Encrypting…");
    try {
      const backup = await createEncryptedBackup({
        profileId: k.profileId,
        publicKeyBase58: k.publicKeyBase58,
        privateKeyBase58: k.privateKeyBase58,
        passphrase: p1,
      });
      downloadBackupFile(backup);
      const session = opts.getSession() || {};
      opts.setSession({ ...session, key_backup_exported_at: new Date().toISOString() });
      setStatus(
        exportStatus,
        "Downloaded. Store the file offline. We cannot reset your passphrase."
      );
      if (exportPass) exportPass.value = "";
      if (exportPass2) exportPass2.value = "";
    } catch (err) {
      setStatus(exportStatus, err.message || String(err), true);
    } finally {
      exportBtn.disabled = false;
    }
  });

  importBtn?.addEventListener("click", async () => {
    const file = importFile?.files?.[0];
    if (!file) {
      setStatus(importStatus, "Choose a backup file first.", true);
      return;
    }
    const passphrase = importPass?.value ?? "";
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setStatus(importStatus, `Enter your backup passphrase (${MIN_PASSPHRASE_LENGTH}+ chars).`, true);
      return;
    }
    importBtn.disabled = true;
    setStatus(importStatus, "Decrypting…");
    try {
      const backup = await readBackupFile(file);
      const unlocked = await decryptBackup(backup, passphrase);
      if (opts.profileId && unlocked.profileId !== opts.profileId) {
        throw new Error(
          "This backup is for a different profile. Open /created/ with matching profile_id or import from the home create flow."
        );
      }
      const session = opts.getSession() || {
        profile_id: unlocked.profileId,
        qr_id: new URLSearchParams(location.search).get("qr_id"),
      };
      opts.setSession({
        ...session,
        profile_id: unlocked.profileId,
        owner_public_key_b58: unlocked.publicKeyBase58,
        owner_private_key_b58: unlocked.privateKeyBase58,
        key_imported_at: new Date().toISOString(),
      });
      setStatus(importStatus, "Backup unlocked. Owner controls are available below.");
      if (importPass) importPass.value = "";
      if (importFile) importFile.value = "";
      opts.onKeysUnlocked();
    } catch (err) {
      setStatus(importStatus, err.message || String(err), true);
    } finally {
      importBtn.disabled = false;
    }
  });
}

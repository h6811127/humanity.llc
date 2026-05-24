/**
 * Export / import UI for encrypted owner key backup (M5.5).
 */
import {
  createEncryptedBackup,
  decryptBackup,
  downloadBackupFile,
  importErrorMessage,
  MIN_PASSPHRASE_LENGTH,
  normalizePassphrase,
  readBackupFile,
} from "./key-backup.mjs";

/**
 * @param {{
 *   profileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   onKeysUnlocked: () => void,
 * }} opts
 */
export function initKeyBackupUi(opts) {
  const exportBlock = document.getElementById("backup-export-block");
  const exportForm = document.getElementById("export-backup-form");
  const exportStatus = document.getElementById("export-backup-status");
  const importForm = document.getElementById("import-backup-form");
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

  function refreshExportVisibility() {
    if (exportBlock) exportBlock.hidden = !sessionKeys();
  }

  refreshExportVisibility();

  exportForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const k = sessionKeys();
    if (!k) {
      setStatus(exportStatus, "Create a card in this tab first, then download a backup.", true);
      return;
    }
    const fd = new FormData(exportForm);
    const p1 = normalizePassphrase(String(fd.get("passphrase") ?? ""));
    const p2 = normalizePassphrase(String(fd.get("passphrase_confirm") ?? ""));
    if (p1.length < MIN_PASSPHRASE_LENGTH) {
      setStatus(
        exportStatus,
        `Use at least ${MIN_PASSPHRASE_LENGTH} characters for the backup passphrase.`,
        true
      );
      return;
    }
    if (p1 !== p2) {
      setStatus(exportStatus, "Passphrases do not match.", true);
      return;
    }
    const btn = exportForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
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
        "Downloaded. Store the file safely on your device; we cannot reset your passphrase or recover this backup."
      );
      exportForm.reset();
    } catch (err) {
      setStatus(exportStatus, importErrorMessage(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  importForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = importForm.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      setStatus(importStatus, "Choose your .hcbackup.json file first.", true);
      return;
    }
    const fd = new FormData(importForm);
    const rawPass = fd.get("passphrase");
    const passphrase = normalizePassphrase(
      typeof rawPass === "string" ? rawPass : String(importForm.querySelector("#import-passphrase")?.value ?? "")
    );
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setStatus(
        importStatus,
        importErrorMessage(new Error(`PASSPHRASE_TOO_SHORT:${passphrase.length}`)),
        true
      );
      return;
    }
    const btn = importForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    setStatus(importStatus, "Opening backup…");
    try {
      const backup = await readBackupFile(file);
      const unlocked = await decryptBackup(backup, passphrase);
      if (opts.profileId && unlocked.profileId !== opts.profileId) {
        throw new Error(
          "This backup belongs to a different card. Use the /created/ link from the device that created it."
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
      setStatus(
        importStatus,
        "Unlocked locally. Revoke controls are available below."
      );
      importForm.reset();
      refreshExportVisibility();
      opts.onKeysUnlocked();
      document.getElementById("revoke-details")?.setAttribute("open", "");
    } catch (err) {
      setStatus(importStatus, importErrorMessage(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  return { refreshExportVisibility };
}

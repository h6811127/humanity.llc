/**
 * Import encrypted backup file into hc_wallet (Phase 3 hub shortcut).
 */
import {
  decryptBackup,
  importErrorMessage,
  MIN_PASSPHRASE_LENGTH,
  normalizePassphrase,
  readBackupFile,
} from "./key-backup.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
import { loadWallet, saveWallet, walletEntryFromSession } from "./device-wallet.mjs";

/**
 * @param {HTMLFormElement | null} form
 * @param {HTMLElement | null} statusEl
 */
export function initHubBackupImport(form, statusEl) {
  if (!form) return;

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = form.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      setStatus("Choose your .hcbackup.json file first.", true);
      return;
    }
    const passInput = form.querySelector("[name=passphrase], #hub-import-passphrase");
    const passphrase = normalizePassphrase(String(passInput?.value ?? ""));
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setStatus(importErrorMessage(new Error(`PASSPHRASE_TOO_SHORT:${passphrase.length}`)), true);
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    setStatus("Opening backup…");
    try {
      const backup = await readBackupFile(file);
      const unlocked = await decryptBackup(backup, passphrase);
      const entries = loadWallet();
      const idx = entries.findIndex((e) => e.profile_id === unlocked.profileId);
      const session = {
        profile_id: unlocked.profileId,
        owner_public_key_b58: unlocked.publicKeyBase58,
        owner_private_key_b58: unlocked.privateKeyBase58,
        handle: idx >= 0 ? entries[idx].handle : undefined,
        scan_url:
          idx >= 0 && entries[idx].scan_url
            ? entries[idx].scan_url
            : `${location.origin}/c/${unlocked.profileId}`,
      };
      if (idx >= 0) {
        entries[idx] = {
          ...entries[idx],
          owner_public_key_b58: unlocked.publicKeyBase58,
          owner_private_key_b58: unlocked.privateKeyBase58,
          saved_at: new Date().toISOString(),
        };
        saveWallet(entries);
      } else {
        entries.unshift(walletEntryFromSession(session, unlocked.profileId.slice(0, 12)));
        saveWallet(entries);
      }
      setStatus("Imported to this device. Use keys to open /created/.");
      logDeviceActivity("backup_import", "Imported backup");
      window.dispatchEvent(new Event("hc-device-hub-changed"));
      form.reset();
    } catch (err) {
      setStatus(importErrorMessage(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

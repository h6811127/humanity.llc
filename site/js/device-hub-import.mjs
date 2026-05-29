/**
 * Import encrypted backup file into hc_wallet (Phase 3 hub shortcut).
 * M5.5: loads keys into this tab and offers /created/ controls.
 */
import {
  decryptBackup,
  importErrorMessage,
  MIN_PASSPHRASE_LENGTH,
  normalizePassphrase,
  readBackupFile,
} from "./key-backup.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
import { IMPORT_OWNERSHIP_LOADED_TAB } from "./device-ownership-copy-core.mjs";
import { activateWalletEntry, openCardNowPage } from "./device-keys.mjs";
import { mergeBackupIntoWallet } from "./device-hub-import-core.mjs";
import { loadWallet, saveWallet, walletEntryFromSession } from "./device-wallet.mjs";

/**
 * @param {HTMLElement | null} statusEl
 */
function clearImportOpenControlsCta(statusEl) {
  const existing = statusEl?.parentElement?.querySelector("#hub-import-open-controls");
  existing?.remove();
}

/**
 * @param {HTMLElement | null} statusEl
 * @param {Record<string, unknown>} entry
 */
function showImportOpenControlsCta(statusEl, entry) {
  clearImportOpenControlsCta(statusEl);
  if (!statusEl?.parentElement) return;
  const cta = document.createElement("button");
  cta.type = "button";
  cta.id = "hub-import-open-controls";
  cta.className = "btn-secondary hub-import-open-controls";
  cta.textContent = "Open card controls";
  cta.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    openCardNowPage(entry);
  });
  statusEl.insertAdjacentElement("afterend", cta);
}

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
    if (isError) clearImportOpenControlsCta(statusEl);
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
      const idx = entries.findIndex((ent) => ent.profile_id === unlocked.profileId);
      const defaultScanUrl =
        idx >= 0 && entries[idx].scan_url
          ? String(entries[idx].scan_url)
          : `${location.origin}/c/${unlocked.profileId}`;
      const merged = mergeBackupIntoWallet(
        entries,
        {
          profileId: unlocked.profileId,
          publicKeyBase58: unlocked.publicKeyBase58,
          privateKeyBase58: unlocked.privateKeyBase58,
        },
        defaultScanUrl
      );
      let walletEntries = merged.entries;
      let savedEntry = merged.entry;
      if (merged.isNew) {
        const session = {
          profile_id: unlocked.profileId,
          owner_public_key_b58: unlocked.publicKeyBase58,
          owner_private_key_b58: unlocked.privateKeyBase58,
          scan_url: defaultScanUrl,
          handle: undefined,
        };
        savedEntry = walletEntryFromSession(session, unlocked.profileId.slice(0, 12));
        walletEntries = [savedEntry, ...entries];
      }
      const write = saveWallet(walletEntries);
      if ("error" in write) {
        setStatus(write.error, true);
        return;
      }
      activateWalletEntry(savedEntry);
      setStatus(IMPORT_OWNERSHIP_LOADED_TAB);
      showImportOpenControlsCta(statusEl, savedEntry);
      logDeviceActivity("backup_import", savedEntry.label || "Imported backup", {
        profile_id: unlocked.profileId,
        qr_id: savedEntry.qr_id ?? null,
      });
      window.dispatchEvent(new Event("hc-device-hub-changed"));
      form.reset();
    } catch (err) {
      setStatus(importErrorMessage(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

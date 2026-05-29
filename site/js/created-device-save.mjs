import { markSetupDone } from "./created-mode.mjs";
import {
  clearAutoSaveFailed,
  isAutoSaveEnabled,
  isAutoSaveFailed,
  markAutoSaveFailed,
} from "./device-auto-save.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
import { shouldShowCreatedOwnershipSaveUi } from "./device-ownership-notice-core.mjs";
import {
  defaultWalletLabel,
  isWalletSaved,
  saveSessionToWallet,
} from "./device-wallet.mjs";

/**
 * @param {() => Record<string, unknown> | null} getSession
 */
export function initCreatedDeviceSave(getSession) {
  const card = document.getElementById("created-keys-strip");
  const form = document.getElementById("created-device-save-form");
  const labelInput = document.getElementById("created-device-save-label");
  const statusEl = document.getElementById("created-device-save-status");
  const doneEl = document.getElementById("created-device-save-done");
  const saveBtn = document.getElementById("created-device-save-btn");
  if (!card) return;

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
  }

  function refresh() {
    const session = getSession();
    const hasKeys = !!(session?.profile_id && session?.owner_private_key_b58);
    if (!hasKeys) {
      card.hidden = true;
      return;
    }
    const saved = isWalletSaved(session.profile_id);
    const showUi = shouldShowCreatedOwnershipSaveUi({
      savedOnDevice: saved,
      autoSaveEnabled: isAutoSaveEnabled(),
      autoSaveFailed: isAutoSaveFailed(session.profile_id),
    });
    if (!showUi) {
      card.hidden = true;
      if (!saved && isAutoSaveEnabled()) {
        queueMicrotask(() => runSave({ quiet: true }));
      }
      return;
    }
    card.hidden = false;
    if (labelInput) {
      labelInput.placeholder = "Label";
      if (!labelInput.value.trim()) {
        labelInput.value = defaultWalletLabel(session);
      }
    }
    if (saved) {
      const sync = saveSessionToWallet(session, labelInput?.value ?? "");
      if (sync.ok && sync.updated) {
        window.dispatchEvent(new Event("hc-device-hub-changed"));
      }
    }
    if (saved && form && doneEl) {
      form.hidden = true;
      doneEl.hidden = false;
    } else if (form && doneEl) {
      form.hidden = false;
      doneEl.hidden = true;
      if (isAutoSaveEnabled()) {
        queueMicrotask(() => runSave({ quiet: true }));
      }
    }
  }

  /**
   * @param {{ quiet?: boolean }} [opts]
   */
  function runSave(opts = {}) {
    const session = getSession();
    if (!session?.profile_id || !session?.owner_private_key_b58) {
      if (!opts.quiet) {
        setStatus("Ownership not loaded in this tab.", true);
      }
      return false;
    }
    const result = saveSessionToWallet(session, labelInput?.value ?? "");
    if ("error" in result) {
      markAutoSaveFailed(session.profile_id);
      if (!opts.quiet) {
        setStatus(result.error, true);
      }
      refresh();
      window.dispatchEvent(new Event("hc-device-hub-changed"));
      return false;
    }
    clearAutoSaveFailed(session.profile_id);
    if (!opts.quiet) {
      setStatus(
        result.already
          ? "Already saved on this device."
          : result.updated
            ? "Updated saved keys on this device."
            : "Saved on this device.",
        false
      );
    }
    if (!result.already) {
      const label =
        labelInput?.value?.trim() || defaultWalletLabel(session);
      logDeviceActivity("saved", label, {
        profile_id: session.profile_id,
        qr_id: session.qr_id ?? null,
      });
    }
    if (result.ok) markSetupDone(session.profile_id);
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
    return true;
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    runSave();
  });

  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    runSave();
  });

  refresh();
  return { refresh, runSave };
}

import { isAutoSaveEnabled } from "./device-auto-save.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
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
    card.hidden = false;
    if (labelInput) {
      labelInput.placeholder = "Label";
      if (!labelInput.value.trim()) {
        labelInput.value = defaultWalletLabel(session);
      }
    }
    const saved = isWalletSaved(session.profile_id);
    if (saved && form && doneEl) {
      form.hidden = true;
      doneEl.hidden = false;
    } else if (form && doneEl) {
      form.hidden = false;
      doneEl.hidden = true;
      if (isAutoSaveEnabled()) {
        queueMicrotask(() => runSave());
      }
    }
  }

  function runSave() {
    const session = getSession();
    if (!session?.profile_id || !session?.owner_private_key_b58) {
      setStatus("No signing keys in this tab.", true);
      return;
    }
    const result = saveSessionToWallet(session, labelInput?.value ?? "");
    if ("error" in result) {
      setStatus(result.error, true);
      refresh();
      return;
    }
    setStatus(
      result.already ? "Already saved on this device." : "Saved on this device.",
      false
    );
    if (!result.already) {
      const label =
        labelInput?.value?.trim() || defaultWalletLabel(session);
      logDeviceActivity("saved", label);
    }
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
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
  return { refresh };
}

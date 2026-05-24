import {
  defaultWalletLabel,
  isWalletSaved,
  saveSessionToWallet,
} from "./device-wallet.mjs";

/**
 * @param {() => Record<string, unknown> | null} getSession
 */
export function initCreatedDeviceSave(getSession) {
  const card = document.getElementById("device-save-card");
  const form = document.getElementById("created-device-save-form");
  const labelInput = document.getElementById("created-device-save-label");
  const statusEl = document.getElementById("created-device-save-status");
  const doneEl = document.getElementById("created-device-save-done");
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
    }
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const session = getSession();
      const result = saveSessionToWallet(session, labelInput?.value ?? "");
      if ("error" in result) {
        setStatus(result.error, true);
        refresh();
        return;
      }
      setStatus("");
      refresh();
    });
  }

  refresh();
  return { refresh };
}

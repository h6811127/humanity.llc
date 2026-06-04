import {
  clearAutoSaveFailed,
  isAutoSaveEnabled,
  isAutoSaveFailed,
  markAutoSaveFailed,
} from "./device-auto-save.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
import { shouldShowCreatedOwnershipSaveUi } from "./device-ownership-notice-core.mjs";
import { shouldSyncAutoSaveOnCreatedLoad } from "./created-device-save-core.mjs";
import {
  defaultWalletLabel,
  isWalletSaved,
} from "./device-wallet.mjs";
import { saveSessionToWalletWithCustody } from "./device-custody-save.mjs";
import {
  gameSeasonBlocksDeviceUnlock,
  isGameSeasonSetupFlowActive,
} from "./create-organizer-season-core.mjs";
import { shouldDefaultDeviceUnlockAtCreate } from "./device-custody-mode-core.mjs";
import { isDeviceUnlockWebAuthnAvailable } from "./device-custody-webauthn-core.mjs";
import { GAME_SEASON_FACE_ID_SAVE_BLOCKED_MESSAGE } from "./device-ownership-copy-core.mjs";
import { isLocalStorageEphemeral } from "./private-browsing-detect-core.mjs";

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
      if (
        !saved &&
        shouldSyncAutoSaveOnCreatedLoad({
          autoSaveEnabled: isAutoSaveEnabled(),
          hasSigningKeys: hasKeys,
        })
      ) {
        runSave({ quiet: true });
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
      void saveSessionToWalletWithCustody(session, labelInput?.value ?? "").then((sync) => {
        if ("error" in sync) {
          markAutoSaveFailed(session.profile_id);
          setStatus(sync.error, true);
        } else if (sync.ok && sync.updated) {
          window.dispatchEvent(new Event("hc-device-hub-changed"));
        }
      });
    }
    if (saved && form && doneEl) {
      form.hidden = true;
      doneEl.hidden = false;
    } else if (form && doneEl) {
      form.hidden = false;
      doneEl.hidden = true;
      if (
        shouldSyncAutoSaveOnCreatedLoad({
          autoSaveEnabled: isAutoSaveEnabled(),
          hasSigningKeys: hasKeys,
        })
      ) {
        runSave({ quiet: true });
      }
    }
  }

  /**
   * @param {{ quiet?: boolean }} [opts]
   */
  function wouldAttemptDeviceUnlockSave(session) {
    return shouldDefaultDeviceUnlockAtCreate({
      custodyMode: session?.custody_mode,
      webAuthnAvailable: isDeviceUnlockWebAuthnAvailable(),
      organizerEnabled: Boolean(session?.organizer_private_key_b58),
      gameSeasonFlow: gameSeasonBlocksDeviceUnlock({
        session,
        setupFlowActive: isGameSeasonSetupFlowActive(),
      }),
      ephemeralBrowsing: isLocalStorageEphemeral(),
    });
  }

  async function runSave(opts = {}) {
    const session = getSession();
    if (!session?.profile_id || !session?.owner_private_key_b58) {
      if (!opts.quiet) {
        setStatus("Ownership not loaded in this tab.", true);
      }
      return false;
    }
    if (
      gameSeasonBlocksDeviceUnlock({
        session,
        setupFlowActive: isGameSeasonSetupFlowActive(),
      }) &&
      wouldAttemptDeviceUnlockSave(session)
    ) {
      if (!opts.quiet && typeof window !== "undefined") {
        window.alert(GAME_SEASON_FACE_ID_SAVE_BLOCKED_MESSAGE);
        setStatus(GAME_SEASON_FACE_ID_SAVE_BLOCKED_MESSAGE, true);
      }
      return false;
    }
    const result = await saveSessionToWalletWithCustody(session, labelInput?.value ?? "");
    if ("error" in result) {
      markAutoSaveFailed(session.profile_id);
      refresh();
      setStatus(result.error, true);
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
    refresh();
    window.dispatchEvent(new Event("hc-device-hub-changed"));
    return true;
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void runSave();
  });

  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    void runSave();
  });

  refresh();
  return { refresh, runSave };
}

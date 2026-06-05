/**
 * Hub recovery-code import — paste scan link + recovery code (PWA / Safari handoff).
 */
import { logDeviceActivity } from "./device-activity.mjs";
import {
  HUB_RESTORE_RECOVERY_HINT,
  HUB_RESTORE_RECOVERY_SUMMARY,
  HUB_RECOVERY_DEVICE_UNLOCK_REENROLL_HINT,
  IMPORT_OWNERSHIP_LOADED_TAB,
} from "./device-ownership-copy-core.mjs";
import { activateWalletEntry, openCardNowPage } from "./device-keys.mjs";
import {
  assertRecoveryKeyMatchesCard,
  mergeRecoveryIntoWallet,
  parseProfileIdFromCardRef,
} from "./device-hub-import-recovery-core.mjs";
import { getCardJsonUrl, publicKeyFromPrivateKeyBase58 } from "./hc-sign.mjs";
import { buildOfficialScanUrl } from "./qr-scan-url-lock.mjs";
import { markSetupDone } from "./created-mode.mjs";
import { loadWallet, saveWallet, walletEntryQrId } from "./device-wallet.mjs";
import {
  normalizeWalletRecoveryImportLabels,
  normalizeWalletScanUrls,
  parseQrIdFromCardRef,
} from "./device-wallet-scan-url-core.mjs";

const HUB_RECOVERY_FORM_HINT_ID = "hub-recovery-import-form-hint";
const HUB_RECOVERY_SUMMARY_CLASS = "hub-recovery-import-list-sub";

function clearImportOpenControlsCta(statusEl) {
  const existing = statusEl?.parentElement?.querySelector("#hub-recovery-import-open-controls");
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
  cta.id = "hub-recovery-import-open-controls";
  cta.className = "btn-secondary hub-import-open-controls";
  cta.textContent = "Continue";
  cta.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
    openCardNowPage(entry);
  });
  statusEl.insertAdjacentElement("afterend", cta);
}

/**
 * @param {HTMLFormElement | null} form
 */
export function applyHubRestoreRecoveryCopy(form) {
  if (!form) return;
  const hintEl = document.getElementById(HUB_RECOVERY_FORM_HINT_ID);
  if (hintEl) hintEl.textContent = HUB_RESTORE_RECOVERY_HINT;
  form.closest(".device-hub-import")?.querySelectorAll(`.${HUB_RECOVERY_SUMMARY_CLASS}`)?.forEach((el) => {
    el.textContent = HUB_RESTORE_RECOVERY_SUMMARY;
  });
}

/**
 * @param {HTMLFormElement | null} form
 * @param {HTMLElement | null} statusEl
 */
export function initHubRecoveryImport(form, statusEl) {
  if (!form) return;
  applyHubRestoreRecoveryCopy(form);

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg;
    statusEl.className = isError ? "form-status error" : "form-status";
    if (isError) clearImportOpenControlsCta(statusEl);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cardRefInput = form.querySelector("[name=card_ref], #hub-recovery-card-ref");
    const recoveryInput = form.querySelector("[name=recovery_code], #hub-recovery-code");
    const cardRef = String(cardRefInput?.value ?? "").trim();
    const recoveryCode = String(recoveryInput?.value ?? "").trim();
    if (!cardRef) {
      setStatus("Paste your scan link or profile ID first.", true);
      return;
    }
    if (!recoveryCode) {
      setStatus("Paste your recovery code first.", true);
      return;
    }
    const profileId = parseProfileIdFromCardRef(cardRef);
    if (!profileId) {
      setStatus("Could not read a card ID from that link. Try your scan URL or profile ID.", true);
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    setStatus("Checking recovery code…");
    try {
      const res = await fetch(getCardJsonUrl(profileId), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Could not load this card from the network.");
      }
      const card = await res.json();
      const recoveryPublicKeyB58 = await assertRecoveryKeyMatchesCard(
        recoveryCode,
        card?.recovery_public_key,
        publicKeyFromPrivateKeyBase58
      );
      const qrId =
        parseQrIdFromCardRef(cardRef) ?? card?.qr?.active_qr_id ?? null;
      const scanUrl =
        qrId != null
          ? buildOfficialScanUrl(profileId, qrId, location.origin)
          : cardRef.startsWith("http") && cardRef.includes("?q=")
            ? cardRef
            : `${location.origin}/c/${profileId}`;
      const merged = mergeRecoveryIntoWallet(loadWallet(), {
        profileId,
        recoveryPublicKeyB58,
        recoveryPrivateKeyB58: recoveryCode,
        ownerPublicKeyB58: card?.public_key ?? null,
        scanUrl,
        qrId,
        handle: card?.handle ?? null,
        manifestoLine: card?.manifesto_line ?? null,
      });
      const write = saveWallet(merged.entries);
      if ("error" in write) {
        setStatus(write.error, true);
        return;
      }
      const repaired = normalizeWalletScanUrls(loadWallet(), location.origin, walletEntryQrId);
      const labeled = normalizeWalletRecoveryImportLabels(repaired.entries);
      if (repaired.changed || labeled.changed) {
        saveWallet(labeled.entries);
      }
      activateWalletEntry(merged.entry);
      markSetupDone(profileId);
      const statusMsg = merged.entry.device_unlock_reenroll_pending
        ? `${IMPORT_OWNERSHIP_LOADED_TAB} ${HUB_RECOVERY_DEVICE_UNLOCK_REENROLL_HINT}`
        : IMPORT_OWNERSHIP_LOADED_TAB;
      setStatus(statusMsg);
      showImportOpenControlsCta(statusEl, merged.entry);
      logDeviceActivity("recovery_import", merged.entry.label || "Imported recovery", {
        profile_id: profileId,
        qr_id: qrId,
      });
      window.dispatchEvent(new Event("hc-device-hub-changed"));
      form.reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

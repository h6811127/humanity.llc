/**
 * Recovery key reveal + import (M5.5.3).
 */
import { getCardJsonUrl, publicKeyFromPrivateKeyBase58 } from "./hc-sign.mjs";

/**
 * @param {{
 *   profileId: string,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   onKeysUnlocked: () => void,
 * }} opts
 */
export function initRecoveryKeyUi(opts) {
  const detailsEl = document.getElementById("created-recovery-details");
  const revealKeyEl = detailsEl?.querySelector("#recovery-key-display");
  const revealConfirm = detailsEl?.querySelector("#recovery-reveal-confirm");
  const revealDismiss = detailsEl?.querySelector("#recovery-reveal-dismiss");
  const copyBtn = detailsEl?.querySelector("#copy-recovery-key");
  const recoveryStatus = detailsEl?.querySelector("#created-recovery-status");
  const importForm = document.getElementById("import-recovery-form");
  const importStatus = document.getElementById("import-recovery-status");

  function setImportStatus(msg, isError = false) {
    if (!importStatus) return;
    importStatus.hidden = !msg;
    importStatus.textContent = msg;
    importStatus.className = isError ? "form-status error" : "form-status";
  }

  function setRecoveryStatus(msg, isError = false) {
    if (!recoveryStatus) return;
    recoveryStatus.hidden = !msg;
    recoveryStatus.textContent = msg;
    recoveryStatus.className = isError ? "form-status error" : "form-status";
  }

  function syncFromSession() {
    const session = opts.getSession();
    const hasRecovery = !!session?.recovery_private_key_b58;

    if (detailsEl) {
      detailsEl.hidden = !hasRecovery;
    }
    if (revealKeyEl && hasRecovery) {
      revealKeyEl.textContent = String(session.recovery_private_key_b58);
    }
    if (revealDismiss) {
      revealDismiss.disabled = false;
    }
  }

  syncFromSession();

  revealConfirm?.addEventListener("change", () => {
    setRecoveryStatus("");
  });

  copyBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = revealKeyEl?.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy recovery key";
      }, 2000);
    } catch {
      copyBtn.textContent = "Select and copy manually";
    }
  });

  revealDismiss?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!revealConfirm?.checked) {
      setRecoveryStatus("Check the box after you save the recovery key.", true);
      revealConfirm?.focus();
      return;
    }
    const s = opts.getSession() || {};
    opts.setSession({ ...s, recovery_key_acknowledged: true });
    if (detailsEl) detailsEl.open = false;
    setRecoveryStatus("Recovery key marked saved. It can restore root-card control for this card and its object QRs.");
    window.dispatchEvent(new CustomEvent("hc-recovery-acknowledged"));
  });

  importForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = importForm.querySelector("#import-recovery-key");
    const raw = String(input?.value ?? "").trim();
    if (!raw) {
      setImportStatus("Paste your recovery private key first.", true);
      return;
    }
    setImportStatus("Checking key…");
    try {
      const derivedPub = await publicKeyFromPrivateKeyBase58(raw);
      const res = await fetch(getCardJsonUrl(opts.profileId));
      if (!res.ok) {
        throw new Error("Could not load card from resolver.");
      }
      const card = await res.json();
      const expected = card?.recovery_public_key;
      if (!expected) {
        throw new Error("This card has no recovery key on file. Use encrypted backup instead.");
      }
      if (derivedPub !== expected) {
        throw new Error("Recovery key does not match this card.");
      }
      const s = opts.getSession() || { profile_id: opts.profileId };
      opts.setSession({
        ...s,
        recovery_public_key_b58: derivedPub,
        recovery_private_key_b58: raw,
        recovery_imported_at: new Date().toISOString(),
      });
      setImportStatus("Recovery key unlocked locally. Root-card controls are available below for this card and its object QRs.");
      importForm.reset();
      syncFromSession();
      opts.onKeysUnlocked();
      document.getElementById("revoke-details")?.setAttribute("open", "");
    } catch (err) {
      setImportStatus(err.message || String(err), true);
    }
  });

  return { refresh: syncFromSession };
}

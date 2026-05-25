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
  const revealKeyEl = document.getElementById("recovery-key-display");
  const revealConfirm = document.getElementById("recovery-reveal-confirm");
  const revealDismiss = document.getElementById("recovery-reveal-dismiss");
  const copyBtn = document.getElementById("copy-recovery-key");
  const importForm = document.getElementById("import-recovery-form");
  const importStatus = document.getElementById("import-recovery-status");

  function setStatus(msg, isError = false) {
    if (!importStatus) return;
    importStatus.hidden = !msg;
    importStatus.textContent = msg;
    importStatus.className = isError ? "form-status error" : "form-status";
  }

  const session = opts.getSession();
  const hasRecovery = !!session?.recovery_private_key_b58;
  const needsAck = hasRecovery && !session?.recovery_key_acknowledged;

  if (detailsEl) {
    detailsEl.hidden = !hasRecovery;
    if (needsAck) detailsEl.open = true;
  }
  if (revealKeyEl && hasRecovery) {
    revealKeyEl.textContent = String(session.recovery_private_key_b58);
  }

  revealConfirm?.addEventListener("change", () => {
    if (revealDismiss) revealDismiss.disabled = !revealConfirm.checked;
  });

  copyBtn?.addEventListener("click", async () => {
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

  revealDismiss?.addEventListener("click", () => {
    if (!revealConfirm?.checked) return;
    const s = opts.getSession() || {};
    opts.setSession({ ...s, recovery_key_acknowledged: true });
    if (detailsEl) detailsEl.open = false;
    window.dispatchEvent(new CustomEvent("hc-recovery-acknowledged"));
  });

  importForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = importForm.querySelector("#import-recovery-key");
    const raw = String(input?.value ?? "").trim();
    if (!raw) {
      setStatus("Paste your recovery private key first.", true);
      return;
    }
    setStatus("Checking key…");
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
      setStatus("Recovery key unlocked locally. Revoke controls are available below.");
      importForm.reset();
      opts.onKeysUnlocked();
      document.getElementById("revoke-details")?.setAttribute("open", "");
    } catch (err) {
      setStatus(err.message || String(err), true);
    }
  });
}

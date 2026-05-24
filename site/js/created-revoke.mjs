/**
 * Owner revoke controls on /created/ (M4.2 + M5.5 import).
 */
import { getCardStatusUrl, postRevokeUrl, signRevocation } from "./hc-sign.mjs";

/**
 * @param {{
 *   profileId: string,
 *   qrId: string,
 *   scanUrl: string | null,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   showError: (msg: string) => void,
 *   onRevoked?: (kind: string) => void,
 * }} ctx
 * @returns {{ refresh: () => void }}
 */
export function initOwnerRevoke(ctx) {
  const revokeDetails = document.getElementById("revoke-details");
  if (!revokeDetails) return { refresh: () => {} };

  const noKeyEl = document.getElementById("owner-no-key");
  const revokeActions = document.getElementById("revoke-actions");
  const revokeQrBlock = document.getElementById("revoke-qr-block");
  const revokeCardBlock = document.getElementById("revoke-card-block");
  const liveStatusEl = document.getElementById("owner-live-status");
  const revokedBannerEl = document.getElementById("owner-revoked-banner");
  const confirmQr = document.getElementById("confirm-revoke-qr");
  const confirmCard = document.getElementById("confirm-revoke-card");
  const revokeQrBtn = document.getElementById("revoke-qr-btn");
  const revokeCardBtn = document.getElementById("revoke-card-btn");
  const revokeStatusEl = document.getElementById("revoke-status");

  function keys() {
    const s = ctx.getSession();
    const ownerPriv = s?.owner_private_key_b58;
    const ownerPub = s?.owner_public_key_b58;
    if (typeof ownerPriv === "string" && typeof ownerPub === "string") {
      return { privateKeyBase58: ownerPriv, publicKeyBase58: ownerPub };
    }
    const recPriv = s?.recovery_private_key_b58;
    const recPub = s?.recovery_public_key_b58;
    if (typeof recPriv === "string" && typeof recPub === "string") {
      return { privateKeyBase58: recPriv, publicKeyBase58: recPub };
    }
    return null;
  }

  function setRevokeStatus(msg, isError = false) {
    if (!revokeStatusEl) return;
    revokeStatusEl.hidden = !msg;
    revokeStatusEl.textContent = msg;
    revokeStatusEl.className = isError ? "form-status error" : "form-status";
  }

  function updateConfirmButtons() {
    const k = keys();
    if (revokeQrBtn) revokeQrBtn.disabled = !k || !confirmQr?.checked;
    if (revokeCardBtn) revokeCardBtn.disabled = !k || !confirmCard?.checked;
  }

  function showRevokedUi(kind) {
    if (revokedBannerEl) {
      revokedBannerEl.hidden = false;
      revokedBannerEl.textContent =
        kind === "card"
          ? "Card disabled. Scans may take up to a minute to update."
          : "This QR is revoked. You can still disable the whole card below.";
    }
    if (kind === "card") {
      if (revokeActions) revokeActions.hidden = true;
    } else if (kind === "qr_credential") {
      if (revokeQrBlock) revokeQrBlock.hidden = true;
      if (revokeCardBlock) revokeCardBlock.hidden = false;
      if (revokeActions) revokeActions.hidden = false;
    }
    if (liveStatusEl) {
      liveStatusEl.textContent =
        kind === "card" ? "Network: card disabled" : "Network: QR revoked";
    }
  }

  function refreshAccessUi() {
    const k = keys();
    if (noKeyEl) noKeyEl.hidden = !!k;
    if (revokeActions) revokeActions.hidden = !k;
    updateConfirmButtons();
  }

  async function refreshLiveStatus() {
    if (!liveStatusEl || !ctx.profileId || !ctx.qrId) return;
    const session = ctx.getSession();
    const revokedKind = session?.revoke_state?.target_kind;
    if (revokedKind === "qr_credential") {
      liveStatusEl.textContent = "Network: QR revoked";
      return;
    }
    if (revokedKind === "card") {
      liveStatusEl.textContent = "Network: card disabled";
      return;
    }
    liveStatusEl.textContent = "Checking network status…";
    try {
      const res = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId));
      const body = await res.json();
      const kind = body?.scan?.kind ?? "unknown";
      if (kind === "active") {
        liveStatusEl.textContent = "Network: active";
      } else if (kind === "qr_revoked") {
        liveStatusEl.textContent = "Network: QR revoked";
        showRevokedUi("qr_credential");
      } else if (kind === "card_revoked") {
        liveStatusEl.textContent = "Network: card disabled";
        showRevokedUi("card");
      } else {
        liveStatusEl.textContent = `Network: ${kind}`;
      }
    } catch {
      liveStatusEl.textContent = keys()
        ? "Could not reach the network."
        : "Network status unavailable here. This page still needs a saved backup or recovery key to sign.";
    }
  }

  async function postRevocation(targetKind) {
    const k = keys();
    if (!k) {
      ctx.showError("Unlock your backup above first.");
      return;
    }

    const targetQrId = targetKind === "qr_credential" ? ctx.qrId : null;
    setRevokeStatus("Signing…");
    if (revokeQrBtn) revokeQrBtn.disabled = true;
    if (revokeCardBtn) revokeCardBtn.disabled = true;

    try {
      const revocation = await signRevocation({
        profileId: ctx.profileId,
        targetKind,
        targetQrId,
        privateKeyBase58: k.privateKeyBase58,
        publicKeyBase58: k.publicKeyBase58,
      });

      setRevokeStatus("Submitting…");
      const res = await fetch(postRevokeUrl(ctx.profileId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || payload.error || `HTTP ${res.status}`);
      }

      const session = ctx.getSession() || {};
      ctx.setSession({
        ...session,
        revoke_state: { target_kind: targetKind, revoked_at: payload.revoked_at },
      });

      setRevokeStatus("");
      showRevokedUi(targetKind);
      updateConfirmButtons();
      ctx.onRevoked?.(targetKind);
      await refreshLiveStatus();
    } catch (err) {
      setRevokeStatus(err.message || String(err), true);
      updateConfirmButtons();
    }
  }

  if (!ctx.profileId || !ctx.qrId) {
    revokeDetails.hidden = true;
    return { refresh: () => {} };
  }

  revokeDetails.hidden = false;

  const session = ctx.getSession();
  if (session?.revoke_state?.target_kind) {
    showRevokedUi(session.revoke_state.target_kind);
  }

  refreshAccessUi();

  if (!confirmQr?.dataset.bound) {
    confirmQr.dataset.bound = "1";
    confirmQr.addEventListener("change", updateConfirmButtons);
  }
  if (!confirmCard?.dataset.bound) {
    confirmCard.dataset.bound = "1";
    confirmCard.addEventListener("change", updateConfirmButtons);
  }
  if (!revokeQrBtn?.dataset.bound) {
    revokeQrBtn.dataset.bound = "1";
    revokeQrBtn.addEventListener("click", () => {
      if (!confirmQr?.checked) return;
      postRevocation("qr_credential");
    });
  }
  if (!revokeCardBtn?.dataset.bound) {
    revokeCardBtn.dataset.bound = "1";
    revokeCardBtn.addEventListener("click", () => {
      if (!confirmCard?.checked) return;
      postRevocation("card");
    });
  }

  refreshLiveStatus();

  return {
    refresh() {
      refreshAccessUi();
      refreshLiveStatus();
    },
  };
}

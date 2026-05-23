/**
 * Owner revoke controls on /created/ (M4.2 — browser-held key, session-only).
 * @see docs/M4_CREATED_REVOKE_UI.md
 */
import {
  BEARER_WARNING,
  getCardStatusUrl,
  postRevokeUrl,
  signRevocation,
} from "./hc-sign.mjs";

/**
 * @param {{
 *   profileId: string,
 *   qrId: string,
 *   scanUrl: string | null,
 *   ownerPrivateKeyB58: string | null,
 *   ownerPublicKeyB58: string | null,
 *   getSession: () => Record<string, unknown> | null,
 *   setSession: (next: Record<string, unknown>) => void,
 *   showError: (msg: string) => void,
 * }} ctx
 */
export function initOwnerRevoke(ctx) {
  const section = document.getElementById("owner-controls");
  if (!section) return;

  const noKeyEl = document.getElementById("owner-no-key");
  const liveStatusEl = document.getElementById("owner-live-status");
  const revokedBannerEl = document.getElementById("owner-revoked-banner");
  const qrPanel = document.getElementById("revoke-qr-panel");
  const cardPanel = document.getElementById("revoke-card-panel");
  const confirmQr = document.getElementById("confirm-revoke-qr");
  const confirmCard = document.getElementById("confirm-revoke-card");
  const revokeQrBtn = document.getElementById("revoke-qr-btn");
  const revokeCardBtn = document.getElementById("revoke-card-btn");
  const revokeStatusEl = document.getElementById("revoke-status");

  const hasKeys =
    !!ctx.ownerPrivateKeyB58 && !!ctx.ownerPublicKeyB58;

  function setRevokeStatus(msg, isError = false) {
    if (!revokeStatusEl) return;
    revokeStatusEl.hidden = !msg;
    revokeStatusEl.textContent = msg;
    revokeStatusEl.className = isError
      ? "form-status error"
      : "form-status";
  }

  function updateConfirmButtons() {
    if (revokeQrBtn) {
      revokeQrBtn.disabled = !confirmQr?.checked;
    }
    if (revokeCardBtn) {
      revokeCardBtn.disabled = !confirmCard?.checked;
    }
  }

  function showRevokedUi(kind) {
    if (revokedBannerEl) {
      revokedBannerEl.hidden = false;
      revokedBannerEl.textContent =
        kind === "card"
          ? "This card is revoked. Scans and public JSON will show revoked state (may take up to a minute on the CDN)."
          : "This scan QR is revoked. Your card may still be active; open the scan page to confirm.";
    }
    if (qrPanel) qrPanel.hidden = true;
    if (cardPanel) cardPanel.hidden = true;
    if (liveStatusEl) {
      liveStatusEl.textContent =
        kind === "card" ? "Resolver: card revoked" : "Resolver: QR revoked";
    }
  }

  async function refreshLiveStatus() {
    if (!liveStatusEl || !ctx.profileId || !ctx.qrId) return;
    liveStatusEl.textContent = "Checking resolver…";
    try {
      const res = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId));
      const body = await res.json();
      const kind = body?.scan?.kind ?? "unknown";
      if (kind === "active") {
        liveStatusEl.textContent = "Resolver: card and this QR are active.";
      } else if (kind === "qr_revoked") {
        liveStatusEl.textContent = "Resolver: this QR is revoked.";
        showRevokedUi("qr_credential");
      } else if (kind === "card_revoked") {
        liveStatusEl.textContent = "Resolver: card is revoked.";
        showRevokedUi("card");
      } else {
        liveStatusEl.textContent = `Resolver: ${kind}`;
      }
    } catch {
      liveStatusEl.textContent =
        "Could not reach resolver status API. Revoke may still work if the Worker is up.";
    }
  }

  async function postRevocation(targetKind) {
    if (!hasKeys) {
      showError(
        "Signing key not available in this browser session. Create the card again on /create/ to revoke from this device."
      );
      return;
    }

    const targetQrId = targetKind === "qr_credential" ? ctx.qrId : null;
    setRevokeStatus("Signing revocation…");
    if (revokeQrBtn) revokeQrBtn.disabled = true;
    if (revokeCardBtn) revokeCardBtn.disabled = true;

    try {
      const revocation = await signRevocation({
        profileId: ctx.profileId,
        targetKind,
        targetQrId,
        privateKeyBase58: ctx.ownerPrivateKeyB58,
        publicKeyBase58: ctx.ownerPublicKeyB58,
      });

      setRevokeStatus("Submitting to resolver…");
      const res = await fetch(postRevokeUrl(ctx.profileId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revocation }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload.message || payload.error || `HTTP ${res.status}`
        );
      }

      const session = ctx.getSession() || {};
      ctx.setSession({
        ...session,
        revoke_state: {
          target_kind: targetKind,
          revoked_at: payload.revoked_at,
        },
      });

      setRevokeStatus("");
      showRevokedUi(targetKind);

      if (ctx.scanUrl && targetKind === "qr_credential") {
        setRevokeStatus(
          `Done. Open your scan page to verify: ${ctx.scanUrl}`
        );
      }
      await refreshLiveStatus();
    } catch (err) {
      setRevokeStatus(err.message || String(err), true);
      updateConfirmButtons();
    }
  }

  if (!ctx.profileId || !ctx.qrId) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  if (!hasKeys) {
    noKeyEl.hidden = false;
    if (qrPanel) qrPanel.hidden = true;
    if (cardPanel) cardPanel.hidden = true;
  } else {
    noKeyEl.hidden = true;
  }

  const session = ctx.getSession();
  if (session?.revoke_state?.target_kind) {
    showRevokedUi(session.revoke_state.target_kind);
  }

  confirmQr?.addEventListener("change", updateConfirmButtons);
  confirmCard?.addEventListener("change", updateConfirmButtons);
  updateConfirmButtons();

  revokeQrBtn?.addEventListener("click", () => {
    if (!confirmQr?.checked) return;
    postRevocation("qr_credential");
  });

  revokeCardBtn?.addEventListener("click", () => {
    if (!confirmCard?.checked) return;
    postRevocation("card");
  });

  refreshLiveStatus();
}

export { BEARER_WARNING };

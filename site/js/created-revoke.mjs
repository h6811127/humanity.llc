/**
 * Owner revoke controls on /created/ (M4.2 + M5.5 import).
 */
import { getCardStatusUrl, postRevokeUrl, signRevocation } from "./hc-sign.mjs";

const ICON_TONE = {
  active: "green",
  warn: "orange",
  bad: "red",
  neutral: "slate",
};

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
  const revokeSummarySub = document.getElementById("revoke-summary-sub");
  const statusCardEl = document.getElementById("owner-status-card");
  const statusQrEl = document.getElementById("owner-status-qr");
  const statusVerificationEl = document.getElementById("owner-status-verification");
  const statusCardIcon = document.getElementById("owner-status-card-icon");
  const statusQrIcon = document.getElementById("owner-status-qr-icon");
  const statusHintEl = document.getElementById("owner-network-status-hint");
  const scanLinkEl = document.getElementById("owner-network-scan-link");
  const revokedBannerEl = document.getElementById("owner-revoked-banner");
  const confirmQr = document.getElementById("confirm-revoke-qr");
  const confirmCard = document.getElementById("confirm-revoke-card");
  const revokeQrBtn = document.getElementById("revoke-qr-btn");
  const revokeCardBtn = document.getElementById("revoke-card-btn");
  const revokeStatusEl = document.getElementById("revoke-status");

  if (scanLinkEl && ctx.scanUrl) {
    scanLinkEl.href = ctx.scanUrl;
    scanLinkEl.hidden = false;
  }

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

  function setIconTone(el, tone) {
    if (!el) return;
    el.className = el.className.replace(/list-icon-tone-\w+/g, "").trim();
    el.classList.add("list-icon", `list-icon-tone-${ICON_TONE[tone] ?? ICON_TONE.neutral}`);
  }

  function capitalize(value) {
    if (!value || typeof value !== "string") return "Unknown";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function cardTone(status) {
    if (status === "active") return "active";
    if (status === "revoked" || status === "suspended") return "bad";
    if (status === "expired") return "warn";
    return "neutral";
  }

  function qrTone(status) {
    if (status === "active") return "active";
    if (status === "revoked") return "bad";
    if (status === "expired" || status === "replaced") return "warn";
    return "neutral";
  }

  function scanKindSummary(kind) {
    if (kind === "active") return "Scans resolve as active";
    if (kind === "qr_revoked") return "Scans show this QR revoked";
    if (kind === "card_revoked") return "Scans show card disabled";
    if (kind === "qr_expired") return "Scans show QR expired";
    if (kind === "card_suspended") return "Scans show card suspended";
    return `Scans resolve as: ${kind}`;
  }

  function updateSummarySub(cardLine, qrLine, scanKind) {
    if (!revokeSummarySub) return;
    revokeSummarySub.textContent = `${scanKindSummary(scanKind)} · Card ${cardLine} · QR ${qrLine}`;
  }

  function applyNetworkStatus(body, scanKindOverride) {
    const scan = body?.scan ?? {};
    const cardStatus = scan.card?.status ?? "unknown";
    const qrStatus = scan.qr?.status ?? "unknown";
    const humanTrust = scan.human_trust;
    const verificationLabel = scan.verification?.label ?? "Unknown";
    const scanKind = scanKindOverride ?? scan.kind ?? "unknown";

    if (statusCardEl) {
      statusCardEl.textContent = capitalize(cardStatus);
    }
    if (statusQrEl) {
      const expiry = scan.qr?.expires_at;
      statusQrEl.textContent = expiry
        ? `${capitalize(qrStatus)} · valid until ${formatShortDate(expiry)}`
        : capitalize(qrStatus);
    }
    if (statusVerificationEl) {
      statusVerificationEl.textContent = humanTrust
        ? `${humanTrust.label} — ${humanTrust.subtitle}`
        : verificationLabel;
    }

    setIconTone(statusCardIcon, cardTone(cardStatus));
    setIconTone(statusQrIcon, qrTone(qrStatus));

    updateSummarySub(cardStatus, qrStatus, scanKind);

    if (statusHintEl) {
      if (scanKind === "active") {
        statusHintEl.textContent =
          "Revoking changes this live answer on the network. The printed URL stays the same — only the resolver status changes.";
      } else if (scanKind === "qr_revoked") {
        statusHintEl.textContent =
          "This QR is already revoked on the network. Scanners see revoked state; you can still disable the whole card below.";
      } else if (scanKind === "card_revoked") {
        statusHintEl.textContent =
          "This card is disabled on the network. All QRs on this card should scan as inactive.";
      } else {
        statusHintEl.textContent = scanKindSummary(scanKind);
      }
    }
  }

  function formatShortDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
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
      applyNetworkStatus(
        {
          scan: {
            kind: "card_revoked",
            card: { status: "revoked" },
            qr: { status: "revoked" },
            verification: { label: "Unknown" },
          },
        },
        "card_revoked"
      );
    } else if (kind === "qr_credential") {
      if (revokeQrBlock) revokeQrBlock.hidden = true;
      if (revokeCardBlock) revokeCardBlock.hidden = false;
      if (revokeActions) revokeActions.hidden = false;
      applyNetworkStatus(
        {
          scan: {
            kind: "qr_revoked",
            card: { status: "active" },
            qr: { status: "revoked" },
            verification: { label: "Registered" },
          },
        },
        "qr_revoked"
      );
    }
  }

  function refreshAccessUi() {
    const k = keys();
    if (noKeyEl) noKeyEl.hidden = !!k;
    if (revokeActions) revokeActions.hidden = !k;
    updateConfirmButtons();
  }

  async function refreshLiveStatus() {
    if (!ctx.profileId || !ctx.qrId) return;

    const session = ctx.getSession();
    const revokedKind = session?.revoke_state?.target_kind;
    if (revokedKind) {
      showRevokedUi(revokedKind);
      return;
    }

    if (statusCardEl) statusCardEl.textContent = "Checking…";
    if (statusQrEl) statusQrEl.textContent = "Checking…";
    if (statusVerificationEl) statusVerificationEl.textContent = "Checking…";
    if (revokeSummarySub) revokeSummarySub.textContent = "Checking live scan answer…";

    try {
      const res = await fetch(getCardStatusUrl(ctx.profileId, ctx.qrId), { cache: "no-store" });
      const body = await res.json();
      const kind = body?.scan?.kind ?? "unknown";

      applyNetworkStatus(body, kind);

      if (kind === "qr_revoked") showRevokedUi("qr_credential");
      else if (kind === "card_revoked") showRevokedUi("card");
    } catch {
      if (statusCardEl) statusCardEl.textContent = "Unreachable";
      if (statusQrEl) statusQrEl.textContent = "Unreachable";
      if (statusVerificationEl) statusVerificationEl.textContent = "—";
      if (revokeSummarySub) revokeSummarySub.textContent = "Could not reach the network";
      if (statusHintEl) {
        statusHintEl.textContent =
          "Could not fetch live status. Check your connection, then reopen this panel.";
      }
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

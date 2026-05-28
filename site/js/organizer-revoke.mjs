import {
  postRevokeUrl,
  publicKeyFromPrivateKeyBase58,
  signRevocation,
} from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const params = new URLSearchParams(location.search);
const profileInput = document.getElementById("org-profile-id");
const qrInput = document.getElementById("org-qr-id");
const keyInput = document.getElementById("org-private-key");
const confirmQr = document.getElementById("org-confirm-qr");
const confirmCard = document.getElementById("org-confirm-card");
const revokeQrBtn = document.getElementById("org-revoke-qr-btn");
const revokeCardBtn = document.getElementById("org-revoke-card-btn");
const statusEl = document.getElementById("org-revoke-status");

const profileFromUrl = params.get("profile_id")?.trim();
const qrFromUrl = params.get("qr_id")?.trim();
if (profileFromUrl && profileInput) profileInput.value = profileFromUrl;
if (qrFromUrl && qrInput) qrInput.value = qrFromUrl;

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !msg;
  statusEl.textContent = msg;
  statusEl.className = isError ? "form-status error" : "form-status";
}

function updateButtons() {
  const hasKey = !!keyInput?.value?.trim();
  if (revokeQrBtn) {
    revokeQrBtn.disabled = !hasKey || !confirmQr?.checked;
  }
  if (revokeCardBtn) {
    revokeCardBtn.disabled = !hasKey || !confirmCard?.checked;
  }
}

confirmQr?.addEventListener("change", updateButtons);
confirmCard?.addEventListener("change", updateButtons);
keyInput?.addEventListener("input", updateButtons);
updateButtons();

async function submitOrganizerRevoke(targetKind) {
  const profileId = profileInput?.value?.trim();
  const privateKeyBase58 = keyInput?.value?.trim();
  const targetQrId = targetKind === "qr_credential" ? qrInput?.value?.trim() : null;

  if (!profileId) {
    setStatus("Profile ID is required.", true);
    return;
  }
  if (!privateKeyBase58) {
    setStatus("Organizer private key is required.", true);
    return;
  }
  if (targetKind === "qr_credential" && !targetQrId) {
    setStatus("QR ID is required to revoke a single QR.", true);
    return;
  }

  setStatus("Signing…");
  if (revokeQrBtn) revokeQrBtn.disabled = true;
  if (revokeCardBtn) revokeCardBtn.disabled = true;

  try {
    const publicKeyBase58 = await publicKeyFromPrivateKeyBase58(privateKeyBase58);
    const revocation = await signRevocation({
      profileId,
      targetKind,
      targetQrId,
      privateKeyBase58,
      publicKeyBase58,
      reason: "organizer_revoked",
    });

    setStatus("Submitting to resolver…");
    const res = await fetch(postRevokeUrl(profileId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revocation }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const url = postRevokeUrl(profileId);
      throw new Error(
        resolverErrorMessage(payload, {
          status: res.status,
          requestUrl: url,
          fallback: "Could not revoke on the network.",
        })
      );
    }

    const label =
      targetKind === "card"
        ? "Card disabled on the network."
        : "QR revoked on the network.";
    setStatus(`${label} Scan again to verify.`);
    if (confirmQr) confirmQr.checked = false;
    if (confirmCard) confirmCard.checked = false;
  } catch (err) {
    setStatus(err.message || String(err), true);
  } finally {
    updateButtons();
  }
}

revokeQrBtn?.addEventListener("click", () => {
  if (!confirmQr?.checked) return;
  submitOrganizerRevoke("qr_credential");
});

revokeCardBtn?.addEventListener("click", () => {
  if (!confirmCard?.checked) return;
  submitOrganizerRevoke("card");
});

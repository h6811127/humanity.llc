import { getCardJsonUrl, qrScanUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { initOwnerRevoke } from "./created-revoke.mjs";

const params = new URLSearchParams(location.search);
const profileIdParam = params.get("profile_id")?.trim() || null;
const qrIdParam = params.get("qr_id")?.trim() || null;

const errorEl = document.getElementById("created-error");

function showError(msg) {
  if (!errorEl) return;
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(next) {
  sessionStorage.setItem("hc_created", JSON.stringify(next));
}

let data = loadSession();

const apiOrigin = resolverApiOrigin();
const scanOrigin =
  apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
    ? apiOrigin
    : location.origin;

const profileId = data?.profile_id || profileIdParam;
const qrId = data?.qr_id || qrIdParam;
const scanUrl =
  data?.scan_url ||
  (profileId && qrId ? qrScanUrl(profileId, qrId, scanOrigin) : null);

const noSessionEl = document.getElementById("no-session");
const handleEl = document.getElementById("created-handle");
const manifestoEl = document.getElementById("created-manifesto");
const scanUrlEl = document.getElementById("scan-url");
const qrImg = document.getElementById("qr-img");
const copyBtn = document.getElementById("copy-scan");
const profileIdEl = document.getElementById("profile-id");
const cardStatusEl = document.getElementById("card-status");
const jsonLink = document.getElementById("card-json-link");

if (!profileId && !qrId && !data) {
  noSessionEl.hidden = false;
} else if (!profileId || !qrId) {
  noSessionEl.hidden = false;
  noSessionEl.textContent =
    "Missing profile or QR in this link. Create a new card, or open the full URL from your create confirmation.";
}

if (data?.handle) {
  handleEl.textContent = `@${data.handle}`;
} else if (!profileId) {
  handleEl.textContent = "—";
}

if (data?.manifesto_line) {
  manifestoEl.textContent = data.manifesto_line;
}

if (profileId) {
  profileIdEl.textContent = profileId;
  jsonLink.href = getCardJsonUrl(profileId);
  jsonLink.removeAttribute("aria-disabled");
} else {
  jsonLink.href = "#";
  jsonLink.setAttribute("aria-disabled", "true");
}

if (data?.verification?.label) {
  cardStatusEl.textContent = data.verification.label;
} else if (data?.status) {
  cardStatusEl.textContent = data.status;
}

if (scanUrl) {
  scanUrlEl.textContent = scanUrl;
  copyBtn.disabled = false;
  copyBtn.onclick = () => navigator.clipboard.writeText(scanUrl);

  try {
    const { renderQrToImage } = await import("./qr-render.mjs");
    await renderQrToImage(qrImg, scanUrl);
  } catch (err) {
    console.error(err);
    qrImg.alt = "Could not generate QR in this browser";
    showError(
      "Scan link is ready, but QR image failed to render. Use Copy scan link below."
    );
  }
} else {
  copyBtn.disabled = true;
  scanUrlEl.textContent =
    "Scan link unavailable. Finish create on /create/ and wait for the redirect, or open a URL with profile_id and qr_id.";
}

const bearerHint = document.getElementById("created-bearer-hint");
if (bearerHint) {
  bearerHint.textContent =
    "This link is your live scan URL. It does not prove who holds a printed copy; the scan page states that clearly.";
}

if (profileId && qrId) {
  initOwnerRevoke({
    profileId,
    qrId,
    scanUrl,
    ownerPrivateKeyB58: data?.owner_private_key_b58 ?? null,
    ownerPublicKeyB58: data?.owner_public_key_b58 ?? null,
    getSession: loadSession,
    setSession: saveSession,
    showError,
  });
}

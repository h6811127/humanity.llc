import { getCardJsonUrl, qrScanUrl, resolverApiOrigin } from "./hc-sign.mjs";
import { initOwnerRevoke } from "./created-revoke.mjs";
import { initKeyBackupUi } from "./key-backup-ui.mjs";
import { initRecoveryKeyUi } from "./recovery-key-ui.mjs";

const params = new URLSearchParams(location.search);
const profileIdParam = params.get("profile_id")?.trim() || null;
const qrIdParam = params.get("qr_id")?.trim() || null;

const errorEl = document.getElementById("created-error");
const loopSteps = document.querySelectorAll(".created-loop-step");

function showError(msg) {
  if (!errorEl) return;
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function setLoopStep(step) {
  loopSteps.forEach((el) => {
    el.classList.toggle("is-current", el.dataset.step === step);
    el.classList.toggle("is-done", el.dataset.stepDone === "1");
  });
}

function markLoopDone(step) {
  const el = document.querySelector(`.created-loop-step[data-step="${step}"]`);
  if (el) el.dataset.stepDone = "1";
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
const openScanBtn = document.getElementById("open-scan");
const profileIdEl = document.getElementById("profile-id");
const cardStatusEl = document.getElementById("card-status");
const resolverCardStatusEl = document.getElementById("resolver-card-status");
const jsonLink = document.getElementById("card-json-link");
const revokeDetails = document.getElementById("revoke-details");

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
} else {
  jsonLink.removeAttribute("href");
}

if (data?.verification?.label) {
  cardStatusEl.textContent = data.verification.label;
} else {
  cardStatusEl.textContent = "Registered";
}

if (resolverCardStatusEl) {
  const cardState = data?.status || "active";
  resolverCardStatusEl.textContent =
    cardState.charAt(0).toUpperCase() + cardState.slice(1);
}

if (scanUrl) {
  scanUrlEl.textContent = scanUrl;
  copyBtn.disabled = false;
  copyBtn.onclick = () => navigator.clipboard.writeText(scanUrl);

  if (openScanBtn) {
    openScanBtn.hidden = false;
    openScanBtn.href = scanUrl;
    openScanBtn.addEventListener("click", () => {
      markLoopDone("scan");
      setLoopStep("revoke");
      if (revokeDetails && !revokeDetails.open) {
        revokeDetails.open = true;
      }
    });
  }

  try {
    const { renderQrToImage } = await import("./qr-render.mjs");
    await renderQrToImage(qrImg, scanUrl);
  } catch (err) {
    console.error(err);
    qrImg.alt = "Could not generate QR";
    showError("Scan link is ready. Copy link below.");
  }
} else {
  copyBtn.disabled = true;
  scanUrlEl.textContent = "Scan link unavailable.";
}

setLoopStep("live");

if (profileId && qrId) {
  const revokeCtx = {
    profileId,
    qrId,
    scanUrl,
    getSession: loadSession,
    setSession: saveSession,
    showError,
    onRevoked(kind) {
      markLoopDone("revoke");
      setLoopStep("scan-again");
      if (openScanBtn && scanUrl) {
        openScanBtn.textContent = "Scan again (see revoked state)";
      }
    },
  };
  const revoke = initOwnerRevoke(revokeCtx);
  const backup = initKeyBackupUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => {
      backup?.refreshExportVisibility();
      revoke?.refresh();
    },
  });
  initRecoveryKeyUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => revoke?.refresh(),
  });

  const session = loadSession();
  if (session?.revoke_state?.target_kind) {
    markLoopDone("revoke");
    setLoopStep("scan-again");
  }
}

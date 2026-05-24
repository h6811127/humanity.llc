import {
  getCardJsonUrl,
  getCardStatusUrl,
  getPendingLiveControlChallengeUrl,
  postLiveControlResponseUrl,
  qrScanUrl,
  resolverApiOrigin,
  signLiveControlResponse,
} from "./hc-sign.mjs";
import { initOwnerRevoke } from "./created-revoke.mjs";
import { initKeyBackupUi } from "./key-backup-ui.mjs";
import { initRecoveryKeyUi } from "./recovery-key-ui.mjs";

const params = new URLSearchParams(location.search);
const profileIdParam = params.get("profile_id")?.trim() || null;
const qrIdParam = params.get("qr_id")?.trim() || null;
const liveChallengeParam = params.get("live_challenge")?.trim() || null;
const liveReturnUrlParam = params.get("return_url")?.trim() || null;

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
const downloadQrBtn = document.getElementById("download-qr");
const openScanBtn = document.getElementById("open-scan");
const profileIdEl = document.getElementById("profile-id");
const cardStatusEl = document.getElementById("card-status");
const networkCardStatusEl = document.getElementById("network-card-status");
const networkQrExpiresEl = document.getElementById("network-qr-expires");
const jsonLink = document.getElementById("card-json-link");
const revokeDetails = document.getElementById("revoke-details");
const ownerActionsEl = document.getElementById("created-owner-actions");
const statusPlateTipEl = document.getElementById("created-status-plate-tip");
const lostItemTipEl = document.getElementById("created-lost-item-tip");

function revealOwnerActions() {
  if (ownerActionsEl) ownerActionsEl.hidden = false;
}

function currentSigningKeys() {
  const session = loadSession();
  const ownerPriv = session?.owner_private_key_b58;
  const ownerPub = session?.owner_public_key_b58;
  if (typeof ownerPriv === "string" && typeof ownerPub === "string") {
    return { privateKeyBase58: ownerPriv, publicKeyBase58: ownerPub };
  }
  const recoveryPriv = session?.recovery_private_key_b58;
  const recoveryPub = session?.recovery_public_key_b58;
  if (typeof recoveryPriv === "string" && typeof recoveryPub === "string") {
    return { privateKeyBase58: recoveryPriv, publicKeyBase58: recoveryPub };
  }
  return null;
}

function initLiveControlProof() {
  const panel = document.getElementById("live-control-proof");
  const btn = document.getElementById("live-control-proof-btn");
  const status = document.getElementById("live-control-proof-status");
  if (!panel || !btn || !status || !profileId || !qrId) {
    return { refresh: () => {} };
  }

  let activeChallengeId = liveChallengeParam;
  let activeReturnUrl = liveReturnUrlParam;
  let pollTimer = null;

  function revealPanel(fromPoll = false) {
    panel.hidden = false;
    if (fromPoll) {
      panel.classList.add("live-control-proof-requested");
    }
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function refresh() {
    const keys = currentSigningKeys();
    btn.disabled = !keys || !activeChallengeId;
    if (!keys) {
      status.textContent =
        "Open this proof link in the original created tab, or unlock a saved recovery key / encrypted backup in More options. humanity.llc cannot prove control for you.";
    } else if (!activeChallengeId) {
      status.textContent =
        "Keep this tab open while someone scans. If they ask for live proof, the sign button will appear here automatically.";
    } else if (!status.textContent || status.textContent.startsWith("Keep this tab open")) {
      status.textContent = "Ready to prove live control.";
    }
  }

  async function pollPendingChallenge() {
    if (activeChallengeId) return;
    const keys = currentSigningKeys();
    if (!keys) return;
    try {
      const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
        cache: "no-store",
      });
      if (res.status === 404) return;
      if (!res.ok) return;
      const body = await res.json();
      if (body.status !== "pending" || !body.challenge_id) return;
      activeChallengeId = body.challenge_id;
      activeReturnUrl =
        typeof body.return_url === "string" ? body.return_url : liveReturnUrlParam;
      revealPanel(true);
      status.textContent =
        "Someone nearby is asking for live proof. Tap below to sign from this device.";
      refresh();
    } catch {
      /* ignore transient poll errors */
    }
  }

  if (liveChallengeParam) {
    revealPanel(false);
  } else {
    pollPendingChallenge();
    pollTimer = window.setInterval(pollPendingChallenge, 3000);
  }

  btn.addEventListener("click", async () => {
    const keys = currentSigningKeys();
    if (!keys || !activeChallengeId) {
      refresh();
      return;
    }
    btn.disabled = true;
    status.textContent = "Signing live proof…";
    try {
      const response = await signLiveControlResponse({
        profileId,
        qrId,
        challengeId: activeChallengeId,
        privateKeyBase58: keys.privateKeyBase58,
        publicKeyBase58: keys.publicKeyBase58,
      });
      status.textContent = "Submitting proof…";
      const res = await fetch(postLiveControlResponseUrl(profileId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || `HTTP ${res.status}`);
      }
      btn.textContent = "Control proven";
      status.textContent =
        "Control proven moments ago. This does not prove legal identity.";
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (activeReturnUrl) {
        window.setTimeout(() => {
          location.href = activeReturnUrl;
        }, 800);
      }
    } catch (err) {
      btn.disabled = false;
      status.textContent = err.message || "Could not prove control.";
    }
  });

  refresh();
  return {
    refresh,
    stopPolling() {
      if (pollTimer) window.clearInterval(pollTimer);
    },
  };
}

function applyPilotTemplateUi(session) {
  if (session?.pilot_template === "status_plate" && statusPlateTipEl) {
    statusPlateTipEl.hidden = false;
  }
  if (session?.pilot_template === "lost_item_relay" && lostItemTipEl) {
    lostItemTipEl.hidden = false;
  }
}

function applyOrganizerHandoffUi(session) {
  const reveal = document.getElementById("organizer-reveal");
  const keyEl = document.getElementById("organizer-key-display");
  const copyBtn = document.getElementById("copy-organizer-key");
  const link = document.getElementById("organizer-revoke-link");
  const linkInline = document.getElementById("organizer-revoke-link-inline");

  const orgUrl = new URL("/organizer-revoke/", location.origin);
  if (profileId) orgUrl.searchParams.set("profile_id", profileId);
  if (qrId) orgUrl.searchParams.set("qr_id", qrId);
  const href = orgUrl.href;
  if (link) link.href = href;
  if (linkInline) linkInline.href = href;

  const priv = session?.organizer_private_key_b58;
  if (!priv || !reveal || !keyEl) return;
  reveal.hidden = false;
  keyEl.textContent = String(priv);
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(String(priv));
      if (copyBtn) copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy organizer key";
      }, 2000);
    } catch {
      copyBtn.textContent = "Select and copy manually";
    }
  });
}

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

if (networkCardStatusEl) {
  const cardState = data?.status || "active";
  networkCardStatusEl.textContent =
    cardState.charAt(0).toUpperCase() + cardState.slice(1);
}

function formatNetworkExpiry(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function capitalizeStatus(value) {
  if (!value || typeof value !== "string") return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function refreshNetworkStatus() {
  if (!profileId || !qrId || !networkQrExpiresEl) return;
  try {
    const res = await fetch(getCardStatusUrl(profileId, qrId), { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    const cardStatus = body.scan?.card?.status;
    const qrExpires = body.scan?.qr?.expires_at;
    if (networkCardStatusEl && cardStatus) {
      networkCardStatusEl.textContent = capitalizeStatus(cardStatus);
    }
    if (qrExpires) {
      networkQrExpiresEl.textContent = formatNetworkExpiry(qrExpires);
    } else if (body.scan?.qr) {
      networkQrExpiresEl.textContent = "No expiry set";
    }
    if (data && qrExpires) {
      const next = { ...data, qr_expires_at: qrExpires };
      saveSession(next);
      data = next;
    }
  } catch {
    /* keep session copy if fetch fails */
  }
}

if (networkQrExpiresEl) {
  const expiresAt = data?.qr_expires_at;
  if (expiresAt) {
    networkQrExpiresEl.textContent = formatNetworkExpiry(expiresAt);
  } else {
    networkQrExpiresEl.textContent = "—";
  }
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
    const { renderQrToImage, downloadQrPng } = await import("./qr-render.mjs");
    await renderQrToImage(qrImg, scanUrl);
    if (downloadQrBtn) {
      downloadQrBtn.disabled = false;
      const slug = data?.handle ? String(data.handle) : qrId?.slice(0, 8) || "scan";
      downloadQrBtn.onclick = async () => {
        const prev = downloadQrBtn.textContent;
        downloadQrBtn.disabled = true;
        try {
          await downloadQrPng(scanUrl, `humanity-${slug}-qr.png`);
          downloadQrBtn.textContent = "Downloaded";
          setTimeout(() => {
            downloadQrBtn.textContent = prev;
          }, 2000);
        } catch (err) {
          showError(err.message || "Could not download QR image.");
        } finally {
          downloadQrBtn.disabled = false;
        }
      };
    }
  } catch (err) {
    console.error(err);
    qrImg.alt = "Could not generate QR";
    showError("Scan link is ready. Copy link below.");
  }
} else {
  copyBtn.disabled = true;
  if (downloadQrBtn) downloadQrBtn.disabled = true;
  scanUrlEl.textContent = "Scan link unavailable.";
}

setLoopStep("live");

if (profileId && qrId) {
  void refreshNetworkStatus();
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
      revealOwnerActions();
      if (openScanBtn && scanUrl) {
        openScanBtn.textContent = "Scan again (see revoked state)";
      }
    },
  };
  const revoke = initOwnerRevoke(revokeCtx);
  const liveControl = initLiveControlProof();
  const backup = initKeyBackupUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => {
      backup?.refreshExportVisibility();
      revoke?.refresh();
      liveControl?.refresh();
    },
  });
  initRecoveryKeyUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => {
      revoke?.refresh();
      liveControl?.refresh();
    },
  });

  const session = loadSession();
  applyPilotTemplateUi(session);
  applyOrganizerHandoffUi(session);
  if (session?.revoke_state?.target_kind) {
    markLoopDone("revoke");
    setLoopStep("scan-again");
    revealOwnerActions();
  }
}

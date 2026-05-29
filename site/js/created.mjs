import {
  getPendingLiveControlChallengeUrl,
  postLiveControlResponseUrl,
  qrScanUrl,
  resolverApiOrigin,
  signLiveControlResponse,
} from "./hc-sign.mjs";
import { initOwnerRevoke } from "./created-revoke.mjs";
import { initVoucherRevoke } from "./vouch-revoke.mjs";
import { initKeyBackupUi } from "./key-backup-ui.mjs";
import { initRecoveryKeyUi } from "./recovery-key-ui.mjs";
import { initCreatedDeveloperExportUi } from "./created-developer-export-ui.mjs";
import { initManifestoUpdate } from "./created-manifesto-update.mjs";
import { initQrRotate } from "./created-qr-rotate.mjs";
import { initQrExtend } from "./created-qr-extend.mjs";
import { inferPilotTemplate, parseManifestoDisplay } from "./manifesto-display.mjs";
import { parseObjectStreamsFromDocument } from "./object-streams-core.mjs";
import { createdLiveProofPollShouldRun, liveProofPanelMostlyVisible, shouldScrollLiveProofPanelIntoView } from "./created-live-proof-poll-core.mjs";
import { initCreatedTabs } from "./created-tabs.mjs";
import { initCreatedDashboard } from "./created-dashboard.mjs?v=6";
import {
  markFirstRevokeDone,
  syncUpdateStatusTaskGate,
} from "./created-first-revoke-gate.mjs?v=2";
import {
  bindStatusPlateLoopScorecard,
  recordStatusPlateUpdate,
  setLoopMilestone as setStatusPlateLoopMilestone,
  syncStatusPlateLoopScorecardDom,
} from "./status-plate-loop-scorecard.mjs";
import {
  bindLostItemRelayLoopScorecard,
  recordLostItemRelayUpdate,
  setLoopMilestone as setLostItemLoopMilestone,
  syncLostItemRelayLoopScorecardDom,
} from "./lost-item-relay-loop-scorecard.mjs";
import { syncCreatedPilotStewardCopy } from "./pilot-steward-copy.mjs";
import { initCreatedDeviceSave } from "./created-device-save.mjs";
import { markSetupDone, modeFromPage, isSetupDone } from "./created-mode.mjs";
import { ownershipBackupSeatbeltSatisfied } from "./created-first-session-gate-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { initCreatedMerchFunnel } from "./created-merch-funnel.mjs";
import { initCreatedChildObject } from "./created-child-object.mjs";
import { initCreatedLostItemRelay } from "./created-child-object-lost-item.mjs";
import { initCreatedSetup } from "./created-setup.mjs";
import { applyStewardScanLinkElement } from "./pwa-scan-handoff-core.mjs";
import { openStewardScanPreviewFromWindow } from "./pwa-scan-handoff.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import {
  applyCreatedWorkspaceMode,
  clearFreshUrlParam,
  restoreKeysStripToControlPanel,
} from "./created-workspace.mjs";
import { createdViewRestoreHashKey } from "./created-view-mode-core.mjs";
import { createdViewDefaultTabId } from "./created-view-live-core.mjs";
import {
  applyCreatedViewModeUi,
  clearCreatedViewModeUi,
  focusCreatedViewRestore,
} from "./created-view-mode.mjs";
import { logDeviceActivity } from "./device-activity.mjs";
import { verificationRecordFromStatusBody } from "./device-wallet-network-core.mjs";
import {
  clearKeylessTabSessionIfPresent,
  getTabSession,
  setTabSession,
  tabSessionHasSigningKeys,
} from "./device-keys.mjs";
import { activateWalletEntryGated } from "./device-control-activation.mjs";
import { isWalletSaved, loadWallet, getWalletSigningKeyCount, saveSessionToWallet } from "./device-wallet.mjs";
import { applyHumanTrustIconToElement } from "./human-trust-ui.mjs";
import {
  applyCreatedRoutePendingShell,
  applyCreatedRouteShell,
  gateCreatedRoute,
} from "./created-route-gate.mjs";
import { getCardJsonUrl, getCardStatusUrl } from "./hc-sign.mjs";
import { resolverErrorMessage } from "./resolver-user-error-core.mjs";
import { viewOnlyNoSessionDetailHtml } from "./created-view-only-copy-core.mjs";

const params = new URLSearchParams(location.search);
const profileIdParam = params.get("profile_id")?.trim() || null;
const qrIdParam = params.get("qr_id")?.trim() || null;
const freshParam = params.get("fresh") === "1";
const liveChallengeParam = params.get("live_challenge")?.trim() || null;
const liveReturnUrlParam = params.get("return_url")?.trim() || null;
const vouchIntentParam = params.get("intent") === "vouch";

initCreatedMerchFunnel({ fresh: freshParam });

const errorEl = document.getElementById("created-error");
const errorDetailEl = document.getElementById("created-error-detail");

function showError(msg) {
  if (!errorEl || !errorDetailEl) return;
  errorEl.hidden = false;
  errorDetailEl.textContent = String(msg);
}

function setNoSessionNotice(html) {
  if (!noSessionEl) return;
  noSessionEl.hidden = false;
  const detail =
    noSessionEl.querySelector("#no-session-detail") ??
    noSessionEl.querySelector(".hc-emphasis-card__detail");
  if (detail) {
    detail.innerHTML = html;
    return;
  }
  noSessionEl.innerHTML = `<p class="hc-notice-body">${html}</p>`;
}

function applyViewOnlyNoSessionCopy() {
  setNoSessionNotice(viewOnlyNoSessionDetailHtml(getWalletSigningKeyCount()));
}

function loadSession() {
  return getTabSession();
}

/** @param {Record<string, unknown>} next */
function saveSession(next) {
  setTabSession(next);
}

/**
 * Update in-page session state; persist only when signing keys are present (P0-6).
 * @param {Record<string, unknown>} next
 */
function applyCreatedSessionState(next) {
  if (tabSessionHasSigningKeys(next)) {
    saveSession(next);
  } else {
    clearKeylessTabSessionIfPresent();
  }
  data = next;
}

function initVouchReturnBanner() {
  const banner = document.getElementById("created-vouch-return-banner");
  const link = document.getElementById("created-vouch-return-link");
  const returnUrl = liveReturnUrlParam;
  if (!banner || !link || !returnUrl || liveChallengeParam) return;
  if (!loadSession()?.owner_private_key_b58) return;
  if (!vouchIntentParam && !returnUrl.includes("/c/")) return;
  banner.hidden = false;
  link.href = returnUrl;
  link.addEventListener("click", () => {
    try {
      sessionStorage.removeItem("hc_vouch_return_url");
    } catch {
      /* ignore */
    }
  });
}

let data = loadSession();

if (profileIdParam && !data?.owner_private_key_b58) {
  const walletEntry = loadWallet().find((e) => e.profile_id === profileIdParam);
  if (walletEntry?.owner_private_key_b58) {
    const activation = await activateWalletEntryGated(walletEntry);
    if (activation.ok) {
      data = loadSession();
    }
  }
}

const noSessionEl = document.getElementById("no-session");

applyCreatedRoutePendingShell();

const routeGate = await gateCreatedRoute({
  profileIdParam,
  qrIdParam,
  loadSession,
  fetchCard: (profileId) =>
    fetch(getCardJsonUrl(profileId), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }),
  fetchStatus: (profileId, qrId) =>
    fetch(getCardStatusUrl(profileId, qrId), { cache: "no-store" }),
});

if (routeGate.action === "redirect_wallet") {
  location.replace("/wallet/");
} else {
  applyCreatedRouteShell(routeGate);
  if (routeGate.action === "invalid_link") {
    showError(routeGate.message ?? "This link is not valid.");
  } else if (routeGate.action === "incomplete_link") {
    setNoSessionNotice(routeGate.message ?? "");
  } else if (routeGate.action === "session_mismatch") {
    setNoSessionNotice(routeGate.noticeHtml ?? "");
  }

  if (routeGate.action === "ok") {
    await bootCreatedMain(routeGate);
  } else if (routeGate.profileId) {
    const profileIdElEarly = document.getElementById("profile-id");
    if (profileIdElEarly) profileIdElEarly.textContent = routeGate.profileId;
    const jsonLinkEarly = document.getElementById("card-json-link");
    if (jsonLinkEarly) jsonLinkEarly.href = getCardJsonUrl(routeGate.profileId);
  }
}

/**
 * @param {{ profileId: string, qrId: string, card?: Record<string, unknown> }} gate
 */
async function bootCreatedMain(gate) {
clearKeylessTabSessionIfPresent();
data = loadSession() ?? data;

const apiOrigin = resolverApiOrigin();
const scanOrigin =
  apiOrigin.includes("127.0.0.1") || apiOrigin.includes("localhost")
    ? apiOrigin
    : location.origin;

const profileId = gate.profileId;
let activeQrId = gate.qrId;
let activeScanUrl =
  data?.scan_url ||
  (profileId && activeQrId ? qrScanUrl(profileId, activeQrId, scanOrigin) : null);

const handleEl = document.getElementById("created-handle");
const manifestoEl = document.getElementById("created-manifesto");
const scanUrlEl = document.getElementById("scan-url");
const qrImg = document.getElementById("qr-img");
const copyBtn = document.getElementById("copy-scan");
const downloadQrBtn = document.getElementById("download-qr");
const openScanBtn = document.getElementById("open-scan");
const profileIdEl = document.getElementById("profile-id");
const humanTrustLabelEl = document.getElementById("human-trust-label");
const humanTrustSubEl = document.getElementById("human-trust-sub");
const humanTrustIconEl = document.getElementById("human-trust-icon");
const networkCardStatusEl = document.getElementById("network-card-status");
const networkQrExpiresEl = document.getElementById("network-qr-expires");
const dashboardMetaEl = document.getElementById("created-hero-meta");
const liveStatusMetaEl = document.getElementById("created-live-status-meta");
const liveNetworkChipEl = document.getElementById("created-live-network-chip");
const liveQrHitEl = document.getElementById("created-live-qr-hit");
const liveQrImgEl = document.getElementById("created-live-qr-img");
const liveManifestoTeaserEl = document.getElementById("created-live-manifesto-teaser");
const liveObjectMetaEl = document.getElementById("created-live-object-meta");
const liveCopyScanEl = document.getElementById("created-live-copy-scan");
const qrPreviewWrap = document.getElementById("created-qr-preview-wrap");
const qrPreviewImg = document.getElementById("created-qr-preview-img");
const saveRequiredBadge = document.getElementById("created-save-required-badge");
const jsonLink = document.getElementById("card-json-link");
const revokeDetails = document.getElementById("revoke-details");
const stewardReviewDetails = document.getElementById("steward-review-details");
const copyProfileIdBtn = document.getElementById("copy-profile-id");
const statusPlateTipEl = document.getElementById("created-status-plate-tip");
const lostItemTipEl = document.getElementById("created-lost-item-tip");

function formatHeroExpiry(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatManifestoTeaser(manifestoLine) {
  if (!manifestoLine?.trim()) return "";
  const d = parseManifestoDisplay(manifestoLine);
  if (d.kind === "general" && d.line) return `"${d.line}"`;
  if (d.kind === "status_plate" && d.objectLabel && d.statusLine) {
    return `"${d.objectLabel}" · ${d.statusLine}`;
  }
  if (d.kind === "lost_item_relay" && d.objectLabel && d.statusLine) {
    return `${d.objectLabel} · ${d.statusLine}`;
  }
  return String(manifestoLine).trim();
}

function buildHeroMetaParts() {
  const parts = [];
  const cardStatus = networkCardStatusEl?.textContent?.trim();
  if (cardStatus && cardStatus !== " - ") {
    parts.push(`Card ${cardStatus.toLowerCase()}`);
  }
  const qrExpiry = networkQrExpiresEl?.textContent?.trim();
  if (qrExpiry && qrExpiry !== " - " && qrExpiry !== "No expiry set") {
    parts.push(`QR expires ${qrExpiry}`);
  } else if (data?.qr_expires_at) {
    parts.push(`QR expires ${formatHeroExpiry(data.qr_expires_at)}`);
  }
  return parts;
}

function updateHeroMeta() {
  const parts = buildHeroMetaParts();
  const metaText = parts.length
    ? parts.join(" · ")
    : "Save your control key to keep update and revoke access in this browser.";
  if (dashboardMetaEl) dashboardMetaEl.textContent = metaText;
  if (liveStatusMetaEl) liveStatusMetaEl.textContent = metaText;

  const cardStatus = networkCardStatusEl?.textContent?.trim()?.toLowerCase();
  if (liveNetworkChipEl) {
    const live =
      cardStatus === "active" || cardStatus === "reachable" || (!cardStatus && data?.status === "active");
    liveNetworkChipEl.hidden = !live;
  }

  syncLiveCockpit();
}

function syncLiveCockpit() {
  const vouchSub = humanTrustSubEl?.textContent?.trim();
  if (liveObjectMetaEl) {
    const vouch =
      vouchSub && vouchSub !== "No accepted vouches yet."
        ? vouchSub
        : data?.verification?.vouch_count > 0
          ? `${data.verification.vouch_count} accepted vouch${data.verification.vouch_count === 1 ? "" : "es"}`
          : "Registered on the network";
    liveObjectMetaEl.textContent = vouch;
  }

  const teaser = formatManifestoTeaser(data?.manifesto_line);
  if (liveManifestoTeaserEl) {
    if (teaser) {
      liveManifestoTeaserEl.textContent = teaser;
      liveManifestoTeaserEl.hidden = false;
    } else {
      liveManifestoTeaserEl.hidden = true;
    }
  }

  if (liveCopyScanEl && copyBtn) {
    liveCopyScanEl.disabled = copyBtn.disabled;
  }

  syncQrPreview();
  window.dispatchEvent(new Event("hc-created-live-cta-sync"));
}

function setResolverReachable(reachable) {
  document.body.dataset.createdResolverReachable = reachable ? "ok" : "offline";
}

function syncQrPreview() {
  if (!qrImg?.src) return;
  if (qrPreviewImg) {
    qrPreviewImg.src = qrImg.src;
    qrPreviewImg.alt = qrImg.alt || "Your scan QR preview";
    if (qrPreviewWrap) qrPreviewWrap.hidden = false;
  }
  if (liveQrImgEl) {
    liveQrImgEl.src = qrImg.src;
    liveQrImgEl.alt = qrImg.alt || "Your scan QR";
    if (liveQrHitEl) liveQrHitEl.hidden = false;
  }
}
let deviceSaveCtl = null;
/** @type {{ refresh?: () => void } | null} */
let childObjectCtl = null;
let lostItemRelayCtl = null;
/** @type {{ select: (tabId: string) => void } | undefined} */
let createdTabs;
let workspaceMode = "view";
let dashboardWired = false;
let downloadQrClick = null;

function getWorkspaceMode() {
  return modeFromPage(profileId, freshParam, loadSession);
}

function enterControlWorkspace() {
  workspaceMode = "control";
  if (profileId) {
    const walletEntry = findWalletEntryByProfileId(profileId);
    if (
      isSetupDone(profileId) ||
      ownershipBackupSeatbeltSatisfied(loadSession(), walletEntry)
    ) {
      markSetupDone(profileId);
    }
  }
  clearFreshUrlParam();
  clearCreatedViewModeUi();
  applyCreatedWorkspaceMode("control");
  restoreKeysStripToControlPanel();
  if (!createdTabs) {
    createdTabs = initCreatedTabs();
  }
  if (!dashboardWired) {
    setupCreatedDashboard();
    dashboardWired = true;
  }
}

function revealOwnerActions() {
  createdTabs?.select("advanced");
  if (revokeDetails && !revokeDetails.open) revokeDetails.open = true;
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
  const lead = document.getElementById("live-control-proof-lead");
  if (!panel || !btn || !status || !profileId || !activeQrId) {
    return { refresh: () => {} };
  }

  const PROVE_BTN_LABEL = "Prove control now";
  const LISTENING_LEAD =
    "Someone nearby scanned your QR and asked for live proof. Sign once from this key-holding device  -  it does not reveal legal identity or create a badge.";
  const LISTENING_STATUS =
    "Keep this tab open while someone scans. The next live proof request will appear here automatically.";
  const REQUESTED_STATUS =
    "Someone nearby is asking for live proof. Tap below to sign from this device.";
  const AFTER_PROOF_STATUS =
    "Control proven. Keep this tab open  -  the next request will appear here automatically.";

  let activeChallengeId = liveChallengeParam;
  let activeReturnUrl = liveReturnUrlParam;
  let pollTimer = null;
  let pollLifecycleBound = false;

  function pollScopeActive() {
    return createdLiveProofPollShouldRun({
      documentVisible:
        typeof document === "undefined" ||
        document.visibilityState === "visible",
      hasSigningKeys: !!currentSigningKeys(),
    });
  }

  function startPolling() {
    if (!pollScopeActive() || pollTimer) return;
    pollTimer = window.setInterval(pollPendingChallenge, 3000);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function bindPollLifecycle() {
    if (pollLifecycleBound || typeof document === "undefined") return;
    pollLifecycleBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
        return;
      }
      void (async () => {
        await pollPendingChallenge();
        refresh();
        if (activeChallengeId) {
          scheduleScrollPanelIntoView("visibility_resume");
        }
      })();
    });
    window.addEventListener("pagehide", () => {
      stopPolling();
    });
  }

  function clearProofUrlParams() {
    const url = new URL(location.href);
    if (!url.searchParams.has("live_challenge") && !url.searchParams.has("return_url")) {
      return;
    }
    url.searchParams.delete("live_challenge");
    url.searchParams.delete("return_url");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  let loggedChallengeId = null;

  function maybeScrollPanelIntoView(reason) {
    if (typeof panel.scrollIntoView !== "function") return;
    const rect = panel.getBoundingClientRect();
    const panelMostlyVisible = liveProofPanelMostlyVisible({
      panelTop: rect.top,
      panelBottom: rect.bottom,
      viewportHeight:
        window.innerHeight || document.documentElement.clientHeight || 0,
    });
    if (!shouldScrollLiveProofPanelIntoView({ reason, panelMostlyVisible })) {
      return;
    }
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scheduleScrollPanelIntoView(reason) {
    if (typeof requestAnimationFrame === "undefined") {
      maybeScrollPanelIntoView(reason);
      return;
    }
    requestAnimationFrame(() => {
      maybeScrollPanelIntoView(reason);
    });
  }

  function showRequestedState() {
    panel.classList.add("live-control-proof-requested");
    if (lead) lead.hidden = true;
    btn.textContent = PROVE_BTN_LABEL;
    status.textContent = REQUESTED_STATUS;
  }

  function revealPanel(fromPoll = false) {
    panel.hidden = false;
    const requested = !!fromPoll || !!activeChallengeId;
    panel.classList.toggle("live-control-proof-requested", requested);
    if (requested) {
      showRequestedState();
    } else if (lead) {
      lead.hidden = false;
    }
    window.dispatchEvent(new Event("hc-created-live-cta-sync"));
    if (activeChallengeId && loggedChallengeId !== activeChallengeId) {
      loggedChallengeId = activeChallengeId;
      const lcLabel =
        data?.handle ? `@${data.handle}` : profileId ? profileId.slice(0, 12) : "Live proof request";
      logDeviceActivity("live_control", lcLabel, {
        profile_id: profileId ?? null,
        qr_id: activeQrId ?? null,
      });
    }
  }

  function showListeningState(message = LISTENING_STATUS) {
    panel.classList.remove("live-control-proof-requested");
    if (lead) {
      lead.hidden = false;
      lead.textContent = LISTENING_LEAD;
    }
    btn.textContent = PROVE_BTN_LABEL;
    status.textContent = message;
  }

  function resetAfterProof() {
    activeChallengeId = null;
    activeReturnUrl = liveReturnUrlParam;
    clearProofUrlParams();
    revealPanel(false);
    showListeningState(AFTER_PROOF_STATUS);
    refresh();
    startPolling();
    void pollPendingChallenge();
  }

  function refresh() {
    const keys = currentSigningKeys();
    btn.disabled = !keys || !activeChallengeId;
    if (!keys) {
      status.textContent =
        "Open this proof link in the original created tab, or unlock a saved recovery key / encrypted backup in Advanced. humanity.llc cannot prove control for you.";
      btn.disabled = true;
    } else if (activeChallengeId) {
      if (lead) lead.hidden = true;
      panel.classList.add("live-control-proof-requested");
      btn.textContent = PROVE_BTN_LABEL;
      if (
        !status.textContent ||
        status.textContent === LISTENING_STATUS ||
        status.textContent === AFTER_PROOF_STATUS
      ) {
        status.textContent = REQUESTED_STATUS;
      }
    } else if (
      status.textContent !== AFTER_PROOF_STATUS &&
      status.textContent !== LISTENING_STATUS
    ) {
      showListeningState(LISTENING_STATUS);
    }
    if (keys && pollScopeActive()) {
      startPolling();
    } else {
      stopPolling();
    }
  }

  async function pollPendingChallenge() {
    if (!pollScopeActive()) return;
    if (activeChallengeId) return;
    const keys = currentSigningKeys();
    if (!keys) return;
    try {
      const res = await fetch(getPendingLiveControlChallengeUrl(profileId, activeQrId), {
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
      scheduleScrollPanelIntoView("poll_discovered");
      refresh();
      window.dispatchEvent(new Event("hc-created-live-cta-sync"));
    } catch {
      /* ignore transient poll errors */
    }
  }

  bindPollLifecycle();

  if (liveChallengeParam) {
    revealPanel(true);
    scheduleScrollPanelIntoView("deeplink");
  } else if (pollScopeActive()) {
    startPolling();
    void pollPendingChallenge();
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
        qrId: activeQrId,
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
        const url = postLiveControlResponseUrl(profileId);
        throw new Error(
          resolverErrorMessage(body, {
            status: res.status,
            requestUrl: url,
            fallback: "Could not prove control.",
          })
        );
      }
      resetAfterProof();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = PROVE_BTN_LABEL;
      status.textContent = err.message || "Could not prove control.";
    }
  });

  refresh();
  return {
    refresh,
    stopPolling,
  };
}

function resolvePilotTemplate(session) {
  if (session?.pilot_template) return session.pilot_template;
  if (session?.manifesto_line) return inferPilotTemplate(session.manifesto_line);
  return "general";
}

function pilotScorecardHandle(session = loadSession()) {
  return session?.handle ?? data?.handle ?? null;
}

function syncStatusPlateScorecard(profileId, record) {
  syncStatusPlateLoopScorecardDom(profileId, record, pilotScorecardHandle());
}

function syncLostItemScorecard(profileId, record) {
  syncLostItemRelayLoopScorecardDom(profileId, record, pilotScorecardHandle());
}

function applyPilotTemplateUi(session) {
  const pilot = resolvePilotTemplate(session);
  syncCreatedPilotStewardCopy(pilot);
  if (pilot === "status_plate" && statusPlateTipEl) {
    statusPlateTipEl.hidden = false;
    bindStatusPlateLoopScorecard(profileId, pilotScorecardHandle(session));
  }
  if (pilot === "lost_item_relay" && lostItemTipEl) {
    lostItemTipEl.hidden = false;
    bindLostItemRelayLoopScorecard(profileId, pilotScorecardHandle(session));
  }
  childObjectCtl?.refresh?.();
  lostItemRelayCtl?.refresh?.();
}

/** Load handle/manifesto/created_at from resolver when session is partial (return visit). */
async function hydrateSessionFromNetwork() {
  if (!profileId) return;
  const existing = loadSession() || {};
  if (existing.handle && existing.manifesto_line && existing.created_at) return;

  const res = await fetch(getCardJsonUrl(profileId), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return;
  const card = await res.json();
  if (!card?.handle || !card?.manifesto_line) return;

  const streams = parseObjectStreamsFromDocument(card);
  const next = {
    ...existing,
    profile_id: profileId,
    qr_id: existing.qr_id || activeQrId,
    handle: card.handle,
    manifesto_line: card.manifesto_line,
    created_at: card.created_at,
    status: card.status || existing.status || "active",
    pilot_template:
      existing.pilot_template || inferPilotTemplate(card.manifesto_line),
    ...(streams.length ? { object_streams: streams } : {}),
  };
  applyCreatedSessionState(next);
  if (handleEl) handleEl.textContent = `@${card.handle}`;
  if (manifestoEl) manifestoEl.textContent = card.manifesto_line;
}

function applyOrganizerHandoffUi(session) {
  const reveal = document.getElementById("organizer-reveal");
  const keyEl = document.getElementById("organizer-key-display");
  const copyBtn = document.getElementById("copy-organizer-key");
  const link = document.getElementById("organizer-revoke-link");
  const linkInline = document.getElementById("organizer-revoke-link-inline");

  const orgUrl = new URL("/organizer-revoke/", location.origin);
  if (profileId) orgUrl.searchParams.set("profile_id", profileId);
  if (activeQrId) orgUrl.searchParams.set("qr_id", activeQrId);
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

if (gate.card?.handle && gate.card?.manifesto_line) {
  const existing = loadSession() || {};
  if (!existing.handle || !existing.manifesto_line) {
    const next = {
      ...existing,
      profile_id: profileId,
      qr_id: activeQrId,
      handle: gate.card.handle,
      manifesto_line: gate.card.manifesto_line,
      created_at: gate.card.created_at ?? existing.created_at,
      status: gate.card.status || existing.status || "active",
      pilot_template:
        existing.pilot_template || inferPilotTemplate(String(gate.card.manifesto_line)),
    };
    applyCreatedSessionState(next);
  }
}

if (data?.handle) {
  handleEl.textContent = `@${data.handle}`;
} else if (!profileId) {
  handleEl.textContent = " - ";
}

if (data?.manifesto_line) {
  manifestoEl.textContent = data.manifesto_line;
  manifestoEl.hidden = false;
  syncLiveCockpit();
}

if (profileId) {
  profileIdEl.textContent = profileId;
  if (jsonLink) jsonLink.href = getCardJsonUrl(profileId);
  if (copyProfileIdBtn) {
    copyProfileIdBtn.hidden = false;
    copyProfileIdBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(profileId);
        copyProfileIdBtn.textContent = "Copied";
        setTimeout(() => {
          copyProfileIdBtn.textContent = "Copy";
        }, 2000);
      } catch {
        copyProfileIdBtn.textContent = "Select ID";
      }
    };
  }
} else if (jsonLink) {
  jsonLink.removeAttribute("href");
}

function displayVouchLabel(label) {
  if (!label || label === "Registered") return "Vouch status";
  return label;
}

function displayVouchSubtitle(subtitle) {
  if (!subtitle) return "No accepted vouches yet.";
  return subtitle.replace(/\s*-\s*registered on this operator/i, "").trim() || subtitle;
}

function applyHumanTrustDisplay(ht, verification) {
  if (!ht) return;
  const label = displayVouchLabel(ht.label);
  if (humanTrustLabelEl) {
    humanTrustLabelEl.textContent = label;
  }
  if (humanTrustSubEl) {
    humanTrustSubEl.textContent = displayVouchSubtitle(ht.subtitle);
  }
  applyHumanTrustIconToElement(humanTrustIconEl, {
    label: ht.label ?? label,
    subtitle: ht.subtitle,
    state: verification?.state ?? null,
  });
  const state = verification?.state ?? null;
  if (stewardReviewDetails) {
    // Operator workflow entry appears only for stewards in this tab.
    stewardReviewDetails.hidden = state !== "steward";
  }
  syncLiveCockpit();
}

if (data?.verification?.label) {
  applyHumanTrustDisplay({
    label: data.verification.label,
    subtitle:
      data.verification.vouch_count > 0
        ? `${data.verification.vouch_count} accepted vouch${data.verification.vouch_count === 1 ? "" : "es"}`
        : "No accepted vouches yet.",
  });
} else {
  applyHumanTrustDisplay({
    label: "Vouch status",
    subtitle: "No accepted vouches yet.",
  });
}

if (networkCardStatusEl) {
  const cardState = data?.status || gate.card?.status;
  networkCardStatusEl.textContent = cardState
    ? cardState.charAt(0).toUpperCase() + String(cardState).slice(1)
    : "Checking…";
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
  if (!value || typeof value !== "string") return " - ";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function refreshNetworkStatus() {
  if (!profileId || !activeQrId) return;
  try {
    const res = await fetch(getCardStatusUrl(profileId, activeQrId), { cache: "no-store" });
    if (!res.ok) {
      setResolverReachable(false);
      updateHeroMeta();
      return;
    }
    setResolverReachable(true);
    const body = await res.json();
    const scan = body.scan ?? {};
    const cardStatus = scan.card?.status;
    const qrExpires = scan.qr?.expires_at;
    if (networkCardStatusEl && cardStatus) {
      networkCardStatusEl.textContent = capitalizeStatus(cardStatus);
    }
    if (networkQrExpiresEl) {
      if (qrExpires) {
        networkQrExpiresEl.textContent = formatHeroExpiry(qrExpires);
      } else if (scan.qr) {
        networkQrExpiresEl.textContent = "No expiry set";
      }
    }
    if (scan.human_trust) {
      applyHumanTrustDisplay(scan.human_trust, scan.verification);
    }
    const verification = verificationRecordFromStatusBody(body);
    if (data) {
      const next = {
        ...data,
        ...(qrExpires ? { qr_expires_at: qrExpires } : {}),
        ...(verification ? { verification } : {}),
      };
      if (
        next.qr_expires_at !== data.qr_expires_at ||
        JSON.stringify(next.verification) !== JSON.stringify(data.verification)
      ) {
        if (tabSessionHasSigningKeys(next)) {
          saveSession(next);
          data = next;
          if (profileId && isWalletSaved(profileId)) {
            saveSessionToWallet(data, "");
          }
          deviceSaveCtl?.refresh?.();
        } else {
          data = next;
        }
      }
    }
  } catch {
    setResolverReachable(false);
  }
  updateHeroMeta();
}

setResolverReachable(true);

if (networkQrExpiresEl) {
  const expiresAt = data?.qr_expires_at;
  if (expiresAt) {
    networkQrExpiresEl.textContent = formatHeroExpiry(expiresAt);
  } else {
    networkQrExpiresEl.textContent = " - ";
  }
}
updateHeroMeta();

function setupCreatedDashboard() {
  initCreatedDashboard({
    selectTab: (id) => createdTabs?.select(id),
    runSave: () => {
      if (!deviceSaveCtl?.runSave) return null;
      return deviceSaveCtl.runSave() === true;
    },
    refreshSave: () => deviceSaveCtl?.refresh?.(),
    getScanUrl: () => {
      const href = openScanBtn?.getAttribute("href");
      return href && href.startsWith("http") ? href : null;
    },
    getProfileId: () => profileId,
    getSession: loadSession,
    hasSigningKeys: () => !!currentSigningKeys(),
  });
}

initVouchReturnBanner();

workspaceMode = getWorkspaceMode();
applyCreatedWorkspaceMode(workspaceMode);

if (workspaceMode === "view" && profileId && activeQrId) {
  clearKeylessTabSessionIfPresent();
  data = loadSession();
  if (noSessionEl) noSessionEl.hidden = true;
  applyCreatedViewModeUi({ signingKeyCount: getWalletSigningKeyCount() });
  createdTabs = initCreatedTabs();
  const restoreHash = createdViewRestoreHashKey(location.hash);
  createdTabs.select(createdViewDefaultTabId(restoreHash));
  if (restoreHash) {
    focusCreatedViewRestore((id) => createdTabs.select(id));
  }
  setupCreatedDashboard();
  dashboardWired = true;
  document.getElementById("created-view-live-restore-btn")?.addEventListener("click", () => {
    focusCreatedViewRestore((id) => createdTabs?.select(id));
  });
} else if (workspaceMode === "view" && noSessionEl) {
  noSessionEl.hidden = false;
  applyViewOnlyNoSessionCopy();
}

if (profileId && activeQrId) {
  deviceSaveCtl = initCreatedDeviceSave(loadSession);
}

if (workspaceMode === "setup" && profileId && activeQrId) {
  initCreatedSetup({
    profileId,
    runSave: () => {
      if (!deviceSaveCtl?.runSave) return null;
      return deviceSaveCtl.runSave() === true;
    },
    refreshSave: () => deviceSaveCtl?.refresh?.(),
    getSession: loadSession,
    setSession: saveSession,
    getScanUrl: () => {
      const href = openScanBtn?.getAttribute("href");
      return href && href.startsWith("http") ? href : null;
    },
    onComplete: enterControlWorkspace,
    onStewardDeepLink: () => enterControlWorkspace(),
    triggerDownloadQr: () => downloadQrClick?.(),
  });
} else if (workspaceMode === "control" && profileId && activeQrId) {
  createdTabs = initCreatedTabs();
  setupCreatedDashboard();
  dashboardWired = true;
  const session = loadSession();
  if (session?.revoke_state?.target_kind) {
    markFirstRevokeDone(profileId);
  }
  syncUpdateStatusTaskGate(profileId, session);
}

if (activeScanUrl) {
  scanUrlEl.textContent = activeScanUrl;
  copyBtn.disabled = false;
  copyBtn.onclick = () => navigator.clipboard.writeText(activeScanUrl);
  if (liveCopyScanEl) {
    liveCopyScanEl.disabled = false;
    liveCopyScanEl.addEventListener("click", () => {
      void navigator.clipboard.writeText(activeScanUrl);
    });
  }

  if (openScanBtn) {
    openScanBtn.hidden = false;
    openScanBtn.href = activeScanUrl;
    applyStewardScanLinkElement(openScanBtn, readStandaloneModeFromWindow(window));
    openScanBtn.addEventListener("click", (e) => {
      if (workspaceMode === "setup") return;
      if (!activeScanUrl?.startsWith("http")) return;
      e.preventDefault();
      const standalone = readStandaloneModeFromWindow(window);
      if (standalone) {
        openStewardScanPreviewFromWindow(activeScanUrl);
        return;
      }
      if (openScanBtn.getAttribute("target") === "_blank") return;
      createdTabs?.select("advanced");
      if (revokeDetails && !revokeDetails.open) {
        revokeDetails.open = true;
      }
    });
  }

  try {
    const { renderQrToImage, downloadQrPng } = await import("./qr-render.mjs");
    await renderQrToImage(qrImg, activeScanUrl);
    syncQrPreview();
    window.dispatchEvent(new Event("hc-created-qr-ready"));
    if (downloadQrBtn) {
      downloadQrBtn.disabled = false;
      const slug = data?.handle ? String(data.handle) : activeQrId?.slice(0, 8) || "scan";
      const runDownload = async () => {
        const prev = downloadQrBtn.textContent;
        downloadQrBtn.disabled = true;
        try {
          await downloadQrPng(activeScanUrl, `humanity-${slug}-qr.png`);
          downloadQrBtn.textContent = "Downloaded";
          if (resolvePilotTemplate(loadSession()) === "status_plate") {
            const row = setStatusPlateLoopMilestone(profileId, "printed", true);
            syncStatusPlateScorecard(profileId, row);
          }
          if (resolvePilotTemplate(loadSession()) === "lost_item_relay") {
            const row = setLostItemLoopMilestone(profileId, "printed", true);
            syncLostItemScorecard(profileId, row);
          }
          setTimeout(() => {
            downloadQrBtn.textContent = prev;
          }, 2000);
        } catch (err) {
          showError(err.message || "Could not download QR image.");
        } finally {
          downloadQrBtn.disabled = false;
        }
      };
      downloadQrBtn.onclick = () => void runDownload();
      downloadQrClick = () => void runDownload();
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

async function bootstrapViewRestoreTools() {
  if (!profileId || !activeQrId) return;

  try {
    await hydrateSessionFromNetwork();
  } catch {
    /* view mode still shows resolver status + QR from scan URL */
  }

  const onRestored = () => {
    enterControlWorkspace();
    void bootstrapOwnerTools();
  };

  const backup = initKeyBackupUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: onRestored,
  });

  const recoveryUi = initRecoveryKeyUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: onRestored,
  });
  recoveryUi?.refresh();
  backup?.refreshExportVisibility();

  const revoke = initOwnerRevoke({
    profileId,
    qrId: activeQrId,
    scanUrl: activeScanUrl,
    getSession: loadSession,
    setSession: saveSession,
    showError,
  });
  revoke?.refresh();
  void refreshNetworkStatus();
}

async function bootstrapOwnerTools() {
  if (!profileId || !activeQrId) return;

  try {
    await hydrateSessionFromNetwork();
  } catch (err) {
    console.error(err);
  }
  syncUpdateStatusTaskGate(profileId, loadSession());
  void refreshNetworkStatus();

  const revokeCtx = {
    profileId,
    qrId: activeQrId,
    scanUrl: activeScanUrl,
    getSession: loadSession,
    setSession: saveSession,
    showError,
    onRevoked(kind) {
      revealOwnerActions();
      if (kind === "qr_credential" || kind === "card") {
        markFirstRevokeDone(profileId);
        syncUpdateStatusTaskGate(profileId, loadSession());
      }
      if (openScanBtn && activeScanUrl) {
        openScanBtn.textContent = "Scan again (see revoked state)";
      }
    },
  };
  const revoke = initOwnerRevoke(revokeCtx);
  const voucherRevoke = initVoucherRevoke({
    voucherProfileId: profileId,
    getSession: loadSession,
    setSession: saveSession,
  });
  const liveControl = initLiveControlProof();
  const manifestoUpdate = initManifestoUpdate({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    showError,
    getSigningKeys: currentSigningKeys,
    onUpdated(manifestoLine) {
      if (manifestoEl) manifestoEl.textContent = manifestoLine;
      const sessionNow = loadSession();
      if (sessionNow) {
        const next = { ...sessionNow, manifesto_line: manifestoLine };
        saveSession(next);
        data = next;
      }
      if (resolvePilotTemplate(loadSession()) === "status_plate") {
        const row = recordStatusPlateUpdate(profileId);
        syncStatusPlateScorecard(profileId, row);
      }
      if (resolvePilotTemplate(loadSession()) === "lost_item_relay") {
        const row = recordLostItemRelayUpdate(profileId);
        syncLostItemScorecard(profileId, row);
      }
      syncLiveCockpit();
      void refreshNetworkStatus();
    },
  });
  manifestoUpdate?.show();

  const qrRotate = initQrRotate({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    showError,
    getSigningKeys: currentSigningKeys,
    async onRotated({ qrId: newQrId, scanUrl: newScanUrl, expiresAt }) {
      activeQrId = newQrId;
      activeScanUrl = newScanUrl;
      data = loadSession();
      if (profileIdEl) profileIdEl.textContent = profileId;
      if (scanUrlEl) scanUrlEl.textContent = newScanUrl;
      if (newScanUrl) {
        if (copyBtn) {
          copyBtn.disabled = false;
          copyBtn.onclick = () => navigator.clipboard.writeText(newScanUrl);
        }
        if (openScanBtn) openScanBtn.href = newScanUrl;
        if (liveCopyScanEl) {
          liveCopyScanEl.disabled = false;
          liveCopyScanEl.onclick = () => {
            void navigator.clipboard.writeText(newScanUrl);
          };
        }
        if (qrImg) {
          try {
            const { renderQrToImage } = await import("./qr-render.mjs");
            await renderQrToImage(qrImg, newScanUrl);
            syncQrPreview();
          } catch (err) {
            console.error(err);
          }
        }
      }
      void refreshNetworkStatus();
      logDeviceActivity("saved", {
        title: "Rotated QR",
        detail: newQrId ? `${newQrId.slice(0, 12)}…` : "New credential",
      });
      if (networkQrExpiresEl && expiresAt) {
        networkQrExpiresEl.textContent = new Date(expiresAt).toLocaleDateString();
      }
    },
  });
  qrRotate?.show();

  const qrExtend = initQrExtend({
    profileId,
    qrId: activeQrId,
    getSession: loadSession,
    setSession: saveSession,
    showError,
    getSigningKeys: currentSigningKeys,
    async onExtended({ expiresAt }) {
      data = loadSession();
      void refreshNetworkStatus();
      if (networkQrExpiresEl && expiresAt) {
        networkQrExpiresEl.textContent = formatNetworkExpiry(expiresAt);
      }
      logDeviceActivity("saved", {
        title: "Extended QR validity",
        detail: new Date(expiresAt).toLocaleDateString(),
      });
    },
  });
  qrExtend?.show();

  childObjectCtl = initCreatedChildObject({
    profileId,
    getSession: loadSession,
    showError,
    getSigningKeys: currentSigningKeys,
  });

  lostItemRelayCtl = initCreatedLostItemRelay({
    profileId,
    getSession: loadSession,
    showError,
    getSigningKeys: currentSigningKeys,
  });

  const backup = initKeyBackupUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => {
      backup?.refreshExportVisibility();
      developerExport?.refreshPubkeyPreview();
      revoke?.refresh();
      voucherRevoke?.refresh();
      liveControl?.refresh();
      childObjectCtl?.refresh?.();
  lostItemRelayCtl?.refresh?.();
    },
  });
  const developerExport = initCreatedDeveloperExportUi({
    getSession: loadSession,
  });
  deviceSaveCtl?.refresh();
  const recoveryUi = initRecoveryKeyUi({
    profileId,
    getSession: loadSession,
    setSession: saveSession,
    onKeysUnlocked: () => {
      revoke?.refresh();
      voucherRevoke?.refresh();
      liveControl?.refresh();
      deviceSaveCtl?.refresh();
      recoveryUi?.refresh();
      developerExport?.refreshPubkeyPreview();
      childObjectCtl?.refresh?.();
  lostItemRelayCtl?.refresh?.();
    },
  });
  deviceSaveCtl?.refresh();
  recoveryUi?.refresh();
  developerExport?.refreshPubkeyPreview();
  window.addEventListener("hc-recovery-acknowledged", () => {
    deviceSaveCtl?.refresh();
    recoveryUi?.refresh();
    childObjectCtl?.refresh?.();
    lostItemRelayCtl?.refresh?.();
  });
  window.addEventListener("hc-key-backup-exported", () => {
    childObjectCtl?.refresh?.();
    lostItemRelayCtl?.refresh?.();
  });
  void manifestoUpdate;

  const session = loadSession();
  applyPilotTemplateUi(session);
  applyOrganizerHandoffUi(session);
  if (session?.revoke_state?.target_kind) {
    revealOwnerActions();
  }
}

if (profileId && activeQrId) {
  if (workspaceMode === "view") {
    void bootstrapViewRestoreTools();
  } else if (workspaceMode === "control") {
    void bootstrapOwnerTools();
  }
}
}

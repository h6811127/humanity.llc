/**
 * Poll pending live-proof for the scanned profile when the viewer owns that card.
 * Feeds scan dot overlay + owner-view CTA; signing stays on /created/.
 * @see docs/SCAN_PAGE_DEVICE_DOT.md Phase 9 · step 1
 */
import {
  buildLiveControlProofHref,
  parsePendingChallengeBody,
} from "./device-live-control-inbox-core.mjs";
import { setScanPageLiveProofPending } from "./device-live-control-inbox.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs";
import {
  findWalletEntryByProfileId,
  walletEntryQrId,
} from "./device-wallet.mjs";
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import { isScanOperatorFamiliar } from "./scan-operator-familiar.mjs";
import {
  scanLiveProofOwnerPollShouldRun,
  scanLiveProofOwnerWalletEntryForScan,
  SCAN_LIVE_PROOF_OWNER_POLL_MS,
} from "./scan-live-proof-owner-watch-core.mjs";

/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null;
let pollLifecycleBound = false;

function readScanContext() {
  const header = document.getElementById("scan-safety-header");
  return {
    profileId: header?.dataset.profileId?.trim() || null,
    qrId: header?.dataset.qrId?.trim() || null,
  };
}

function pollScopeActive() {
  const { profileId, qrId } = readScanContext();
  const entry = scanLiveProofOwnerWalletEntryForScan(
    profileId,
    qrId,
    findWalletEntryByProfileId(profileId ?? ""),
    walletEntryQrId
  );
  return scanLiveProofOwnerPollShouldRun({
    documentVisible: document.visibilityState === "visible",
    operatorFamiliar: isScanOperatorFamiliar(),
    profileId,
    scanQrId: qrId,
    walletEntry: entry,
    resolverHealth: getResolverHealthStatus(),
  });
}

function applyOwnerViewPending(item) {
  const ownerView = document.getElementById("live-control-owner-view");
  const ownerCopy = document.getElementById("live-control-owner-copy");
  const ownerLink = document.getElementById("live-control-owner-created-link");
  if (!ownerView) return;

  if (!item) {
    ownerView.hidden = true;
    if (ownerCopy) {
      ownerCopy.textContent =
        "This section is for someone else scanning your QR. When they ask for live proof, open your card page to sign.";
    }
    if (ownerLink) ownerLink.textContent = "Open your card";
    return;
  }

  ownerView.hidden = false;
  if (ownerCopy) {
    ownerCopy.textContent =
      "Someone nearby asked for live proof. Open your card to sign before the request expires.";
  }
  if (ownerLink instanceof HTMLAnchorElement) {
    ownerLink.textContent = "Prove control now";
    ownerLink.href = buildLiveControlProofHref(item, location.origin);
  }
}

async function pollPendingForScanProfile() {
  if (!pollScopeActive()) {
    setScanPageLiveProofPending(null);
    applyOwnerViewPending(null);
    return;
  }

  const { profileId, qrId } = readScanContext();
  const entry = scanLiveProofOwnerWalletEntryForScan(
    profileId,
    qrId,
    findWalletEntryByProfileId(profileId ?? ""),
    walletEntryQrId
  );
  if (!entry || !profileId || !qrId) return;

  try {
    const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
      cache: "no-store",
    });
    if (res.status === 404) {
      setScanPageLiveProofPending(null);
      applyOwnerViewPending(null);
      return;
    }
    if (!res.ok) return;
    const body = await res.json();
    const item = parsePendingChallengeBody(body, entry);
    if (!item) {
      setScanPageLiveProofPending(null);
      applyOwnerViewPending(null);
      return;
    }
    setScanPageLiveProofPending(item);
    applyOwnerViewPending(item);
  } catch {
    /* ignore transient poll errors */
  }
}

function stopPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  if (!pollScopeActive() || pollTimer != null) return;
  pollTimer = window.setInterval(() => {
    void pollPendingForScanProfile();
  }, SCAN_LIVE_PROOF_OWNER_POLL_MS);
}

function bindPollLifecycle() {
  if (pollLifecycleBound) return;
  pollLifecycleBound = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopPolling();
      return;
    }
    void pollPendingForScanProfile();
    startPolling();
  });

  window.addEventListener("pagehide", () => {
    stopPolling();
    setScanPageLiveProofPending(null);
  });

  window.addEventListener("hc-resolver-health-changed", () => {
    if (!pollScopeActive()) {
      stopPolling();
      setScanPageLiveProofPending(null);
      applyOwnerViewPending(null);
      return;
    }
    void pollPendingForScanProfile();
    startPolling();
  });
}

export function initScanLiveProofOwnerWatch() {
  if (!document.getElementById("scan-safety-header")) return;
  bindPollLifecycle();
  void pollPendingForScanProfile();
  startPolling();
}

initScanLiveProofOwnerWatch();

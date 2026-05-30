/**
 * View-mode /created/: poll for pending live-proof requests and surface restore CTA.
 * @see docs/M7_LIVE_CONTROL_ALPHA.md
 */
import { getPendingLiveControlChallengeUrl } from "./hc-sign.mjs";
import {
  createdLiveProofPendingPollShouldRun,
  shouldScrollLiveProofPanelIntoView,
  liveProofPanelMostlyVisible,
} from "./created-live-proof-poll-core.mjs";
import { CREATED_VIEW_LIVE_PROOF_ID } from "./created-view-live-core.mjs";

const POLL_MS = 3000;
const REQUESTED_STATUS =
  "Someone nearby asked for live proof. Restore your keys below, then tap Prove control now.";
const REQUESTED_LEAD =
  "Live proof is waiting. Load ownership into this tab to sign — keep the tab open.";

/**
 * @param {{
 *   profileId: string,
 *   qrId: string,
 *   onRestoreKeys?: () => void,
 * }} opts
 */
export function initCreatedLiveProofPendingWatch(opts) {
  const { profileId, qrId, onRestoreKeys } = opts;
  const panel = document.getElementById(CREATED_VIEW_LIVE_PROOF_ID);
  const btn = document.getElementById("live-control-proof-btn");
  const status = document.getElementById("live-control-proof-status");
  const lead = document.getElementById("live-control-proof-lead");
  if (!panel || !profileId || !qrId) {
    return { stop: () => {} };
  }

  let pollTimer = null;
  let pollLifecycleBound = false;
  let activeChallengeId = null;

  function pollScopeActive() {
    return createdLiveProofPendingPollShouldRun({
      documentVisible:
        typeof document === "undefined" ||
        document.visibilityState === "visible",
    });
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling() {
    if (!pollScopeActive() || pollTimer) return;
    pollTimer = window.setInterval(() => {
      void pollPendingChallenge();
    }, POLL_MS);
  }

  function maybeScrollPanelIntoView() {
    if (typeof panel.scrollIntoView !== "function") return;
    const rect = panel.getBoundingClientRect();
    const panelMostlyVisible = liveProofPanelMostlyVisible({
      panelTop: rect.top,
      panelBottom: rect.bottom,
      viewportHeight:
        window.innerHeight || document.documentElement.clientHeight || 0,
    });
    if (
      !shouldScrollLiveProofPanelIntoView({
        reason: "poll_discovered",
        panelMostlyVisible,
      })
    ) {
      return;
    }
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showPendingRequest(challengeId) {
    activeChallengeId = challengeId;
    panel.hidden = false;
    panel.classList.add("live-control-proof-requested");
    if (lead) {
      lead.hidden = false;
      lead.textContent = REQUESTED_LEAD;
    }
    if (status) status.textContent = REQUESTED_STATUS;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Prove control now";
    }
    window.dispatchEvent(new Event("hc-created-live-cta-sync"));
    maybeScrollPanelIntoView();
  }

  async function pollPendingChallenge() {
    if (!pollScopeActive() || activeChallengeId) return;
    try {
      const res = await fetch(getPendingLiveControlChallengeUrl(profileId, qrId), {
        cache: "no-store",
      });
      if (res.status === 404) return;
      if (!res.ok) return;
      const body = await res.json();
      if (body.status !== "pending" || !body.challenge_id) return;
      showPendingRequest(body.challenge_id);
    } catch {
      /* ignore transient poll errors */
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
      void pollPendingChallenge();
      startPolling();
    });
    window.addEventListener("pagehide", () => {
      stopPolling();
    });
  }

  bindPollLifecycle();
  if (pollScopeActive()) {
    startPolling();
    void pollPendingChallenge();
  }

  btn?.addEventListener("click", () => {
    if (activeChallengeId && onRestoreKeys) onRestoreKeys();
  });

  return { stop: stopPolling };
}

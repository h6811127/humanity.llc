/**
 * Hosted steward SSE push client (E4c) — leader tab, fetch stream + Authorization.
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { isBrowserNotifEnabled } from "./device-browser-notifications-core.mjs";
import { isWatchLiveProofEnabled } from "./device-hub-network-tools-core.mjs";
import {
  isLiveControlPollLeaderTab,
  claimLiveControlPollLeader,
} from "./device-live-control-poll-leader.mjs";
import { resolveLiveControlPollScope } from "./device-live-control-poll-scheduler.mjs";
import {
  getStewardEntitlementsPolicy,
  readStewardSessionToken,
  stewardPushSubscribeAllowed,
  stewardResolverRequestHeaders,
} from "./device-steward-entitlements.mjs";
import {
  isConnectionAckPushPayload,
  isLiveProofPendingPushPayload,
  isStaleLiveProofPushEvent,
  parseSseMessageBlock,
  parseStewardPushEventPayload,
  shouldMaintainStewardPushConnection,
  stewardPushInFallbackCooldown,
} from "./device-steward-push-core.mjs";
import { syncStewardWebPushSubscription } from "./device-steward-web-push.mjs";

export {
  STEWARD_PUSH_DOWN_FALLBACK_MS,
  shouldMaintainStewardPushConnection,
  stewardPushInFallbackCooldown,
} from "./device-steward-push-core.mjs";

export const STEWARD_PUSH_STATE_CHANGED = "hc-steward-push-state-changed";
export const STEWARD_PUSH_LIVE_PROOF_EVENT = "hc-steward-push-live-proof";

let pushStreamHealthy = false;
let lastPushDownAt = 0;
/** @type {AbortController | null} */
let pushAbort = null;
let pushSyncInFlight = false;
let pushListenersBound = false;

export function isStewardPushHealthy() {
  return pushStreamHealthy === true;
}

export function stewardPushSuppressesAutoPoll() {
  return isStewardPushHealthy();
}

function notifyPushStateChanged() {
  window.dispatchEvent(new Event(STEWARD_PUSH_STATE_CHANGED));
}

function readPushConnectionContext() {
  const hubEl = document.getElementById("device-hub");
  const scopeActive = resolveLiveControlPollScope({
    hubEl,
    inboxSheetOpen: document.body.classList.contains("device-inbox-sheet-open"),
    walletPage: document.body.classList.contains("page-wallet"),
    watchEnabled: isWatchLiveProofEnabled(),
    stewardShellPage: Boolean(document.getElementById("shell-notif-badge")),
  });
  return {
    pushEntitled: stewardPushSubscribeAllowed(getStewardEntitlementsPolicy()),
    watchEnabled: isWatchLiveProofEnabled(),
    browserAlertsEnabled: isBrowserNotifEnabled(),
    hasSession: !!readStewardSessionToken(),
    pollLeader: isLiveControlPollLeaderTab(),
    scopeActive,
    documentVisible: document.visibilityState === "visible",
    inFallbackCooldown: stewardPushInFallbackCooldown(lastPushDownAt),
  };
}

function shouldConnectNow() {
  return shouldMaintainStewardPushConnection(readPushConnectionContext());
}

function markPushDown() {
  pushStreamHealthy = false;
  lastPushDownAt = Date.now();
  notifyPushStateChanged();
}

function markPushUp() {
  const was = pushStreamHealthy;
  pushStreamHealthy = true;
  lastPushDownAt = 0;
  if (!was) notifyPushStateChanged();
}

async function readPushStream(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) {
    markPushDown();
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseMessageBlock(buffer);
      buffer = parsed.remainder;
      for (const msg of parsed.messages) {
        handleSseMessage(msg);
      }
    }
  } catch (err) {
    if (!signal.aborted) {
      console.warn("[humanity] steward push stream error:", err);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    if (!signal.aborted) markPushDown();
  }
}

/**
 * @param {import("./device-steward-push-core.mjs").StewardSseMessage} msg
 */
function handleSseMessage(msg) {
  const payload = parseStewardPushEventPayload(msg.data);
  if (!payload) return;

  if (isConnectionAckPushPayload(payload)) {
    markPushUp();
    return;
  }

  if (!isLiveProofPendingPushPayload(payload)) return;
  if (isStaleLiveProofPushEvent(payload)) return;

  window.dispatchEvent(
    new CustomEvent(STEWARD_PUSH_LIVE_PROOF_EVENT, {
      detail: {
        profile_id: payload.profile_id,
        qr_id: payload.qr_id,
        challenge_id: payload.challenge_id,
        expires_at: payload.expires_at,
        issued_at: payload.issued_at,
      },
    })
  );
}

/**
 * @param {AbortController} abort
 */
async function openPushStream(abort) {
  const token = readStewardSessionToken();
  if (!token) return;

  const headers = {
    Accept: "text/event-stream",
    ...stewardResolverRequestHeaders(),
  };

  const res = await fetch(
    `${resolverApiOrigin()}/.well-known/hc/v1/steward/push`,
    {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      signal: abort.signal,
    }
  );

  if (!res.ok || !res.body) {
    markPushDown();
    return;
  }

  await readPushStream(res, abort.signal);
}

function closePushStream() {
  pushAbort?.abort();
  pushAbort = null;
  if (pushStreamHealthy) {
    pushStreamHealthy = false;
    notifyPushStateChanged();
  }
}

/**
 * Leader tab: connect or disconnect SSE based on entitlements and scope.
 */
export function syncStewardPushConnection() {
  if (typeof window === "undefined") return;
  if (pushSyncInFlight) return;

  if (!shouldConnectNow()) {
    closePushStream();
    return;
  }

  if (!isLiveControlPollLeaderTab()) {
    claimLiveControlPollLeader();
    if (!isLiveControlPollLeaderTab()) return;
  }

  if (pushAbort) return;

  const abort = new AbortController();
  pushAbort = abort;
  pushSyncInFlight = true;
  void openPushStream(abort)
    .catch((err) => {
      if (!abort.signal.aborted) {
        console.warn("[humanity] steward push connect failed:", err);
        markPushDown();
      }
    })
    .finally(() => {
      pushSyncInFlight = false;
      if (pushAbort === abort) pushAbort = null;
    });
}

function bindStewardPushListeners() {
  if (pushListenersBound || typeof window === "undefined") return;
  pushListenersBound = true;

  const refresh = () => {
    syncStewardPushConnection();
    void syncStewardWebPushSubscription();
  };

  window.addEventListener("hc-live-control-poll-scope-changed", refresh);
  window.addEventListener(STEWARD_PUSH_STATE_CHANGED, refresh);
  window.addEventListener("hc-steward-entitlements-changed", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("storage", (e) => {
    if (e.key === "hc_watch_live_proof" || e.key === "hc_browser_notif") refresh();
  });
}

/**
 * Call from live-control inbox bootstrap (idempotent).
 */
export function initStewardPushClient() {
  bindStewardPushListeners();
}

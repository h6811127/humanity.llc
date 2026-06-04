/**
 * Live-proof background alerts when no Humanity tab is running (inbox v2 Phase D).
 * Device-only polling - no server push.
 */
import {
  anyClientVisible,
  buildLiveProofSwNotification,
  buildLiveProofSwNotificationFromPushHint,
  pollWalletEntriesForLiveProof,
  shouldShowSwLiveProofNotification,
  swLiveProofPollingShouldRun,
  SW_MESSAGE_LIVE_PROOF_PUSH,
  SW_NOTIFICATION_TAG,
  SW_PERIODIC_TAG,
  SW_RATE_LIMIT_BACKOFF_MS,
  SW_STATE_CACHE,
  SW_STATE_CACHE_KEY,
  SW_SYNC_TAG,
} from "./js/device-live-control-sw-core.mjs";
import {
  notificationNavigateMessage,
  pickNotificationNavigateClient,
} from "./js/device-live-proof-notification-nav-core.mjs";

/** @typedef {{
 *   enabled: boolean,
 *   apiOrigin: string,
 *   pageOrigin: string,
 *   entries: Array<Record<string, unknown>>,
 *   lastSig: string,
 *   interactShown: boolean,
 *   roundRobinCursor?: number,
 *   pollSlots?: Record<string, import("./js/device-live-control-inbox-core.mjs").LiveControlPendingItem>,
 *   resolverHealth?: 'ok' | 'degraded' | 'offline',
 *   watchLiveProofEnabled?: boolean,
 *   pollBackoffUntil?: number,
 *   stewardPushEntitled?: boolean,
 *   stewardPushHealthy?: boolean,
 *   lastPushChallengeId?: string,
 * }} SwState */

/** @returns {Promise<SwState | null>} */
async function readState() {
  const cache = await caches.open(SW_STATE_CACHE);
  const res = await cache.match(SW_STATE_CACHE_KEY);
  if (!res) return null;
  try {
    return /** @type {SwState} */ (await res.json());
  } catch {
    return null;
  }
}

/** @param {SwState} state */
async function writeState(state) {
  const cache = await caches.open(SW_STATE_CACHE);
  await cache.put(
    SW_STATE_CACHE_KEY,
    new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function pollAndMaybeNotify() {
  const state = await readState();
  if (
    !state?.enabled ||
    !state.apiOrigin ||
    !state.pageOrigin ||
    !swLiveProofPollingShouldRun({
      enabled: state.enabled,
      watchLiveProofEnabled: state.watchLiveProofEnabled === true,
      resolverHealth: state.resolverHealth,
      stewardPushEntitled: state.stewardPushEntitled === true,
      stewardPushHealthy: state.stewardPushHealthy === true,
    })
  ) {
    return;
  }

  if (Date.now() < (state.pollBackoffUntil ?? 0)) return;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) return;

  const {
    pending,
    signature,
    nextCursor,
    pollSlots,
    rateLimited,
  } = await pollWalletEntriesForLiveProof(
    state.entries,
    state.apiOrigin,
    undefined,
    state.roundRobinCursor ?? 0,
    state.pollSlots ?? {}
  );

  const nextState = {
    ...state,
    roundRobinCursor: nextCursor,
    pollSlots,
    pollBackoffUntil: rateLimited
      ? Date.now() + SW_RATE_LIMIT_BACKOFF_MS
      : state.pollBackoffUntil ?? 0,
  };

  if (!shouldShowSwLiveProofNotification(state.lastSig, signature, pending.length)) {
    if (pending.length === 0 && state.lastSig) {
      await writeState({ ...nextState, lastSig: "" });
    } else {
      await writeState(nextState);
    }
    return;
  }

  const first = pending[0];
  const payload = buildLiveProofSwNotification(first, state.pageOrigin);
  const requireInteraction = !state.interactShown;

  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: SW_NOTIFICATION_TAG,
    data: { href: payload.href },
    requireInteraction,
  });

  await writeState({
    ...nextState,
    lastSig: signature,
    interactShown: state.interactShown || requireInteraction,
  });
}

async function notifyFromPushHint(hint) {
  const state = await readState();
  if (!state?.enabled || !state.pageOrigin) return;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) return;

  const payload = buildLiveProofSwNotificationFromPushHint(
    hint,
    state.entries,
    state.pageOrigin
  );
  if (!payload) return;

  const challengeId =
    typeof hint.challenge_id === "string" ? hint.challenge_id.trim() : "";
  if (challengeId && state.lastPushChallengeId === challengeId) return;

  const requireInteraction = !state.interactShown;
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: SW_NOTIFICATION_TAG,
    data: { href: payload.href },
    requireInteraction,
  });

  await writeState({
    ...state,
    lastPushChallengeId: challengeId || state.lastPushChallengeId,
    interactShown: state.interactShown || requireInteraction,
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === SW_MESSAGE_LIVE_PROOF_PUSH) {
    event.waitUntil(notifyFromPushHint(msg.hint ?? msg));
    return;
  }

  if (msg.type !== "HC_SW_SYNC_STATE") return;

  event.waitUntil(
    (async () => {
      const prev = await readState();
      const enabled = !!msg.enabled;
      const watchLiveProofEnabled = msg.watchLiveProofEnabled === true;
      const state = {
        enabled,
        watchLiveProofEnabled,
        apiOrigin: String(msg.apiOrigin || ""),
        pageOrigin: String(msg.pageOrigin || self.location.origin),
        entries: Array.isArray(msg.entries) ? msg.entries : [],
        lastSig: String(msg.lastSig || ""),
        interactShown: !!msg.interactShown,
        resolverHealth:
          msg.resolverHealth === "ok" ||
          msg.resolverHealth === "degraded" ||
          msg.resolverHealth === "offline"
            ? msg.resolverHealth
            : "offline",
        roundRobinCursor: enabled ? (prev?.roundRobinCursor ?? 0) : 0,
        pollSlots: enabled ? (prev?.pollSlots ?? {}) : {},
        pollBackoffUntil: enabled ? (prev?.pollBackoffUntil ?? 0) : 0,
        stewardPushEntitled: msg.stewardPushEntitled === true,
        stewardPushHealthy: msg.stewardPushHealthy === true,
        lastPushChallengeId: enabled ? (prev?.lastPushChallengeId ?? "") : "",
      };

      await writeState(state);
      if (
        msg.pollNow &&
        swLiveProofPollingShouldRun({
          enabled: state.enabled,
          watchLiveProofEnabled: state.watchLiveProofEnabled,
          resolverHealth: state.resolverHealth,
          stewardPushEntitled: state.stewardPushEntitled,
          stewardPushHealthy: state.stewardPushHealthy,
        })
      ) {
        await pollAndMaybeNotify();
      }
    })()
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === SW_SYNC_TAG) {
    event.waitUntil(pollAndMaybeNotify());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === SW_PERIODIC_TAG) {
    event.waitUntil(pollAndMaybeNotify());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href;
  if (!href || typeof href !== "string") return;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const target = pickNotificationNavigateClient(clients, href);
      if (target && "focus" in target) {
        await target.focus();
        try {
          target.postMessage(notificationNavigateMessage(href));
          return;
        } catch {
          /* fall through to openWindow */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href);
      }
    })()
  );
});

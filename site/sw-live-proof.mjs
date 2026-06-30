/**
 * Live-proof background alerts when no Humanity tab is running (inbox v2 Phase D).
 * Tier 1: device polling + page→SW relay. Tier 2: Web Push when page process is dead.
 */
import {
  anyClientVisible,
  buildLiveProofSwNotification,
  buildLiveProofSwNotificationFromPushHint,
  pollAllWalletEntriesForLiveProof,
  pollWalletEntriesForLiveProof,
  pruneSwPushHintCache,
  pushHintChallengeId,
  shouldShowSwLiveProofNotification,
  swLiveProofPollingShouldRun,
  upsertSwPushHintCache,
  upsertCachedOsPlans,
  SW_MESSAGE_DELIVER_OS_PLANS,
  SW_MESSAGE_LIVE_PROOF_PUSH,
  SW_NOTIFICATION_TAG,
  SW_PERIODIC_TAG,
  SW_RATE_LIMIT_BACKOFF_MS,
  SW_STATE_CACHE,
  SW_STATE_CACHE_KEY,
  SW_SYNC_TAG,
} from "./js/device-live-control-sw-core.mjs";
import { osPlanToSwNotificationPayload, buildRelayOfferOsPlan } from "./js/device-notification-delivery-core.mjs";
import {
  HC_SW_OPEN_INBOX,
  notificationNavigateMessage,
  pickNotificationNavigateClient,
} from "./js/device-live-proof-notification-nav-core.mjs";
import {
  isLiveProofPendingPushPayload,
  isStaleLiveProofPushEvent,
  parseWebPushMessageData,
} from "./js/device-steward-push-core.mjs";

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
 *   cachedPushHints?: import("./js/device-live-control-sw-core.mjs").SwCachedPushHint[],
 *   cachedOsPlans?: import("./js/device-notification-delivery-core.mjs").OsNotificationPlan[],
 *   lastOsDedupeByKind?: Record<string, string>,
 *   relayOfferCount?: number,
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

async function pollAndMaybeNotify(opts = {}) {
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
      forcePoll: opts.forcePoll === true,
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

  const pollResult = opts.fullWallet
    ? await pollAllWalletEntriesForLiveProof(
        state.entries,
        state.apiOrigin,
        undefined,
        state.pollSlots ?? {},
        state.roundRobinCursor ?? 0
      )
    : await pollWalletEntriesForLiveProof(
        state.entries,
        state.apiOrigin,
        undefined,
        state.roundRobinCursor ?? 0,
        state.pollSlots ?? {}
      );

  const {
    pending,
    signature,
    nextCursor,
    pollSlots,
    rateLimited,
  } = pollResult;

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

/**
 * @param {import("./js/device-live-control-sw-core.mjs").SwCachedPushHint} hint
 * @param {SwState} state
 * @returns {Promise<SwState>}
 */
async function showLiveProofNotificationForPushHint(hint, state) {
  const payload = buildLiveProofSwNotificationFromPushHint(
    hint,
    state.entries,
    state.pageOrigin
  );
  if (!payload) return state;

  const challengeId = pushHintChallengeId(hint);
  if (challengeId && state.lastPushChallengeId === challengeId) return state;

  const requireInteraction = !state.interactShown;
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: SW_NOTIFICATION_TAG,
    data: { href: payload.href },
    requireInteraction,
  });

  return {
    ...state,
    lastPushChallengeId: challengeId || state.lastPushChallengeId,
    interactShown: state.interactShown || requireInteraction,
  };
}

/**
 * @param {import("./js/device-live-control-sw-core.mjs").SwCachedPushHint} hint
 * @returns {Promise<SwState | null>}
 */
async function cachePushHintInState(hint) {
  const state = await readState();
  if (!state?.enabled) return state;
  const cachedPushHints = pruneSwPushHintCache(
    upsertSwPushHintCache(state.cachedPushHints ?? [], hint)
  );
  const next = { ...state, cachedPushHints };
  await writeState(next);
  return next;
}

async function notifyFromPushHint(hint) {
  const state = await cachePushHintInState(hint);
  if (!state?.enabled || !state.pageOrigin) return;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) return;

  const next = await showLiveProofNotificationForPushHint(hint, state);
  await writeState(next);
}

/**
 * @param {import("./js/device-steward-push-core.mjs").StewardPushEventPayload} payload
 * @returns {import("./js/device-live-control-sw-core.mjs").SwCachedPushHint | null}
 */
function pushHintFromWebPushPayload(payload) {
  const profileId =
    typeof payload.profile_id === "string" ? payload.profile_id.trim() : "";
  const challengeId =
    typeof payload.challenge_id === "string" ? payload.challenge_id.trim() : "";
  if (!profileId || !challengeId) return null;
  return {
    profile_id: profileId,
    qr_id: typeof payload.qr_id === "string" ? payload.qr_id : "",
    challenge_id: challengeId,
    expires_at: typeof payload.expires_at === "string" ? payload.expires_at : "",
    issued_at: typeof payload.issued_at === "string" ? payload.issued_at : "",
  };
}

/**
 * Tier 2 Web Push: operator fan-out when no page process is alive.
 *
 * @param {PushEvent} event
 */
async function notifyFromWebPushEvent(event) {
  const payload = await parseWebPushMessageData(event.data);
  if (!payload || !isLiveProofPendingPushPayload(payload)) return;
  if (isStaleLiveProofPushEvent(payload)) return;
  const hint = pushHintFromWebPushPayload(payload);
  if (!hint) return;
  await notifyFromPushHint(hint);
}

async function flushCachedPushHints() {
  const state = await readState();
  if (!state?.enabled || !state.pageOrigin) return;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) return;

  const cachedPushHints = pruneSwPushHintCache(state.cachedPushHints ?? []);
  if (cachedPushHints.length === 0) {
    if (cachedPushHints.length !== (state.cachedPushHints ?? []).length) {
      await writeState({ ...state, cachedPushHints });
    }
    return;
  }

  let next = { ...state, cachedPushHints };
  for (const hint of cachedPushHints) {
    next = await showLiveProofNotificationForPushHint(hint, next);
  }
  await writeState(next);
}

/**
 * @param {SwState} state
 * @param {import("./js/device-notification-delivery-core.mjs").OsNotificationPlan} plan
 * @returns {Promise<SwState>}
 */
async function showOsPlanIfNeeded(state, plan) {
  if (!plan || typeof plan.title !== "string") return state;
  const dedupe = state.lastOsDedupeByKind ?? {};
  if (dedupe[plan.kind] === plan.dedupeKey) return state;

  const origin = state.pageOrigin;
  const payload = osPlanToSwNotificationPayload(plan, origin);
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    data: payload.data,
    requireInteraction: payload.requireInteraction,
  });

  return {
    ...state,
    lastOsDedupeByKind: { ...dedupe, [plan.kind]: plan.dedupeKey },
    interactShown: state.interactShown || payload.requireInteraction,
  };
}

async function flushCachedOsPlans() {
  const state = await readState();
  if (!state?.enabled || !state.pageOrigin) return;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) return;

  let next = { ...state };
  for (const plan of next.cachedOsPlans ?? []) {
    next = await showOsPlanIfNeeded(next, plan);
  }

  const relayPlan = buildRelayOfferOsPlan(next.relayOfferCount ?? 0);
  if (relayPlan) {
    next = await showOsPlanIfNeeded(next, relayPlan);
  }

  if ((next.relayOfferCount ?? 0) <= 0) {
    next = {
      ...next,
      cachedOsPlans: (next.cachedOsPlans ?? []).filter((plan) => plan.kind !== "relay_offer"),
    };
  }

  await writeState(next);
}

async function flushDeferredOsNotifications() {
  await flushCachedPushHints();
  await flushCachedOsPlans();
}

/**
 * @param {import("./js/device-notification-delivery-core.mjs").OsNotificationPlan[]} plans
 * @param {string} pageOrigin
 */
async function deliverOsPlansFromPage(plans, pageOrigin) {
  const state = await readState();
  if (!state?.enabled) return;

  const incoming = Array.isArray(plans) ? plans.filter((plan) => plan && typeof plan.title === "string") : [];
  const cachedOsPlans = upsertCachedOsPlans(state.cachedOsPlans ?? [], incoming);
  let next = { ...state, cachedOsPlans };

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (anyClientVisible(clients)) {
    await writeState(next);
    return;
  }

  const origin = pageOrigin || state.pageOrigin;
  for (const plan of incoming) {
    next = await showOsPlanIfNeeded({ ...next, pageOrigin: origin }, plan);
  }
  await writeState(next);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(notifyFromWebPushEvent(event));
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === SW_MESSAGE_LIVE_PROOF_PUSH) {
    event.waitUntil(notifyFromPushHint(msg.hint ?? msg));
    return;
  }

  if (msg.type === SW_MESSAGE_DELIVER_OS_PLANS) {
    event.waitUntil(
      deliverOsPlansFromPage(
        Array.isArray(msg.plans) ? msg.plans : [],
        String(msg.pageOrigin || "")
      )
    );
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
        cachedPushHints: enabled
          ? pruneSwPushHintCache(prev?.cachedPushHints ?? [])
          : [],
        cachedOsPlans: enabled ? (prev?.cachedOsPlans ?? []) : [],
        lastOsDedupeByKind: enabled ? (prev?.lastOsDedupeByKind ?? {}) : {},
        relayOfferCount:
          enabled && typeof msg.relayOfferCount === "number" && msg.relayOfferCount >= 0
            ? msg.relayOfferCount
            : 0,
      };

      await writeState(state);
      if (msg.flushPushCache) {
        await flushDeferredOsNotifications();
      }
      if (
        msg.pollNow &&
        swLiveProofPollingShouldRun({
          enabled: state.enabled,
          watchLiveProofEnabled: state.watchLiveProofEnabled,
          resolverHealth: state.resolverHealth,
          stewardPushEntitled: state.stewardPushEntitled,
          stewardPushHealthy: state.stewardPushHealthy,
          forcePoll: true,
        })
      ) {
        await pollAndMaybeNotify({ forcePoll: true, fullWallet: true });
      }
    })()
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === SW_SYNC_TAG) {
    event.waitUntil(
      (async () => {
        await flushDeferredOsNotifications();
        await pollAndMaybeNotify();
      })()
    );
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === SW_PERIODIC_TAG) {
    event.waitUntil(
      (async () => {
        await flushDeferredOsNotifications();
        await pollAndMaybeNotify();
      })()
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      if (data.openInboxOnClick) {
        const state = await readState();
        const walletHref =
          typeof data.walletHref === "string" && data.walletHref
            ? data.walletHref
            : `${state?.pageOrigin ?? self.location.origin}/wallet/`;
        const target = pickNotificationNavigateClient(clients, walletHref);
        if (target && "focus" in target) {
          await target.focus();
          try {
            target.postMessage({ type: HC_SW_OPEN_INBOX });
            return;
          } catch {
            /* fall through to openWindow */
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(walletHref);
        }
        return;
      }

      const href = data.href;
      if (!href || typeof href !== "string") return;

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

/**
 * Hosted steward Web Push subscribe (Tier 2 / RFC P2).
 * SSE remains P1; Web Push enables OS when the page process is dead.
 * @see docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { isBrowserNotifEnabled } from "./device-browser-notifications-core.mjs";
import { registerLiveProofServiceWorker } from "./device-browser-notifications-sw.mjs";
import {
  readStewardSessionToken,
  stewardPushSubscribeAllowed,
  stewardResolverRequestHeaders,
  getStewardEntitlementsPolicy,
} from "./device-steward-entitlements.mjs";
import {
  serializePushSubscriptionForSubscribe,
  shouldMaintainStewardWebPushSubscription,
  stewardWebPushVapidPublicKeyFromCapabilities,
  urlBase64ToUint8Array,
} from "./device-steward-push-core.mjs";

export {
  shouldMaintainStewardWebPushSubscription,
  stewardWebPushVapidPublicKeyFromCapabilities,
} from "./device-steward-push-core.mjs";

const CAPABILITIES_CACHE_MS = 60 * 60 * 1000;
const SUBSCRIBE_PATH = "/.well-known/hc/v1/steward/push/subscribe";

/** @type {string | null} */
let cachedVapidPublicKey = null;
/** @type {number} */
let cachedVapidFetchedAt = 0;
/** @type {Promise<void> | null} */
let syncInFlight = null;

/** @returns {boolean} */
export function stewardWebPushSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function fetchVapidPublicKey() {
  const now = Date.now();
  if (cachedVapidPublicKey && now - cachedVapidFetchedAt < CAPABILITIES_CACHE_MS) {
    return cachedVapidPublicKey;
  }
  try {
    const res = await fetch(
      `${resolverApiOrigin()}/.well-known/hc/v1/operator/capabilities`,
      { credentials: "omit", cache: "no-store" }
    );
    if (!res.ok) return null;
    const body = await res.json();
    cachedVapidPublicKey = stewardWebPushVapidPublicKeyFromCapabilities(body);
    cachedVapidFetchedAt = now;
    return cachedVapidPublicKey;
  } catch {
    return null;
  }
}

/**
 * Register Web Push subscription with operator when entitled + VAPID configured.
 *
 * @returns {Promise<void>}
 */
export async function syncStewardWebPushSubscription() {
  if (!stewardWebPushSupported()) return;
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    const vapidPublicKey = await fetchVapidPublicKey();
    const shouldSubscribe = shouldMaintainStewardWebPushSubscription({
      pushEntitled: stewardPushSubscribeAllowed(getStewardEntitlementsPolicy()),
      browserAlertsEnabled: isBrowserNotifEnabled(),
      hasSession: !!readStewardSessionToken(),
      vapidPublicKey,
    });
    if (!shouldSubscribe || !vapidPublicKey) return;

    const token = readStewardSessionToken();
    if (!token) return;

    const reg = await registerLiveProofServiceWorker();
    if (!reg?.pushManager) return;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    if (!subscription) return;

    const body = serializePushSubscriptionForSubscribe(subscription);
    await fetch(`${resolverApiOrigin()}${SUBSCRIBE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...stewardResolverRequestHeaders(),
      },
      credentials: "omit",
      body: JSON.stringify(body),
    }).catch(() => {
      /* 501 / offline — local SW push handler still works once server sends */
    });
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

/**
 * Unsubscribe PushManager + remove operator row (alerts off / session cleared).
 *
 * @returns {Promise<void>}
 */
export async function clearStewardWebPushSubscription() {
  if (!stewardWebPushSupported()) return;

  const reg = await registerLiveProofServiceWorker();
  const subscription = await reg?.pushManager?.getSubscription();
  const endpoint = subscription?.endpoint ?? "";
  if (subscription) {
    await subscription.unsubscribe().catch(() => null);
  }
  if (!endpoint || !readStewardSessionToken()) return;

  await fetch(`${resolverApiOrigin()}${SUBSCRIBE_PATH}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...stewardResolverRequestHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify({ endpoint }),
  }).catch(() => null);
}

/** @internal tests */
export function resetStewardWebPushCacheForTests() {
  cachedVapidPublicKey = null;
  cachedVapidFetchedAt = 0;
  syncInFlight = null;
}

/**
 * Sync slice for P0-N2-T2 field diagnostics (`notifyTransportFieldSnapshot`).
 *
 * @returns {{
 *   supported: boolean,
 *   push_entitled: boolean,
 *   browser_alerts: boolean,
 *   has_session: boolean,
 *   operator_vapid_cached: boolean,
 *   should_maintain: boolean,
 * }}
 */
export function stewardWebPushTransportSnapshot() {
  const policy = getStewardEntitlementsPolicy();
  const pushEntitled = stewardPushSubscribeAllowed(policy);
  const browserAlertsEnabled = isBrowserNotifEnabled();
  const hasSession = !!readStewardSessionToken();
  return {
    supported: stewardWebPushSupported(),
    push_entitled: pushEntitled,
    browser_alerts: browserAlertsEnabled,
    has_session: hasSession,
    operator_vapid_cached: !!cachedVapidPublicKey,
    should_maintain: shouldMaintainStewardWebPushSubscription({
      pushEntitled,
      browserAlertsEnabled,
      hasSession,
      vapidPublicKey: cachedVapidPublicKey,
    }),
  };
}

/**
 * Async field helper: PushManager subscription endpoint (diagnostics only).
 *
 * @returns {Promise<string | null>}
 */
export async function stewardWebPushSubscriptionEndpoint() {
  if (!stewardWebPushSupported()) return null;
  const reg = await registerLiveProofServiceWorker();
  if (!reg?.pushManager) return null;
  const subscription = await reg.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

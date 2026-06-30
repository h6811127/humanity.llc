/**
 * Service worker registration + state sync for live-proof OS alerts (inbox v2 Phase D).
 * @see docs/DEVICE_INBOX.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { listPollableWalletEntries } from "./device-wallet.mjs";
import { getLiveControlPendingForDisplay } from "./device-live-control-inbox.mjs";
import { liveControlPendingSignature } from "./device-live-control-inbox-core.mjs";
import { isBrowserNotifEnabled } from "./device-browser-notifications-core.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs?v=94";
import {
  liveProofPollTargetsFromWallet,
  resolveSwPeriodicMinIntervalMs,
  SW_MESSAGE_LIVE_PROOF_PUSH,
  SW_PERIODIC_TAG,
  SW_SYNC_TAG,
} from "./device-live-control-sw-core.mjs";
import { isWatchLiveProofEnabled } from "./device-hub-network-tools-core.mjs";
import {
  getStewardEntitlementsPolicy,
  stewardPushSubscribeAllowed,
} from "./device-steward-entitlements.mjs";
import { isStewardPushHealthy } from "./device-steward-push.mjs";

export const SW_SCRIPT_URL = "/sw-live-proof.mjs";

/** @returns {boolean} */
export function liveProofServiceWorkerSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function notificationGranted() {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

/** @returns {Promise<ServiceWorkerRegistration | null>} */
export async function registerLiveProofServiceWorker() {
  if (!liveProofServiceWorkerSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active?.scriptURL?.includes("sw-live-proof")) {
      return existing;
    }
    return await navigator.serviceWorker.register(SW_SCRIPT_URL, {
      type: "module",
      scope: "/",
    });
  } catch (err) {
    console.warn("[humanity] live-proof service worker registration failed:", err);
    return null;
  }
}

/** @returns {Promise<void>} */
export async function unregisterLiveProofServiceWorker() {
  if (!liveProofServiceWorkerSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (reg) {
      if ("periodicSync" in reg) {
        try {
          await reg.periodicSync.unregister(SW_PERIODIC_TAG);
        } catch {
          /* ignore */
        }
      }
      await reg.unregister();
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ pollNow?: boolean }} [opts]
 * @returns {Promise<void>}
 */
export async function syncLiveProofServiceWorkerState(opts = {}) {
  if (!liveProofServiceWorkerSupported()) return;
  if (!isBrowserNotifEnabled() || !notificationGranted()) {
    await teardownLiveProofServiceWorker();
    return;
  }

  const reg = await registerLiveProofServiceWorker();
  if (!reg) return;

  await navigator.serviceWorker.ready.catch(() => null);

  const active = reg.active || (await reg.installing) || (await reg.waiting);
  if (!active) return;

  let interactShown = false;
  try {
    interactShown = sessionStorage.getItem("hc_browser_notif_os_interact") === "1";
  } catch {
    /* ignore */
  }

  const watchOn = isWatchLiveProofEnabled();
  const alertsOn = isBrowserNotifEnabled() && notificationGranted();
  const pending = getLiveControlPendingForDisplay();
  const message = {
    type: "HC_SW_SYNC_STATE",
    enabled: alertsOn,
    watchLiveProofEnabled: watchOn,
    apiOrigin: resolverApiOrigin(),
    pageOrigin: location.origin,
    entries: liveProofPollTargetsFromWallet(listPollableWalletEntries()),
    lastSig: liveControlPendingSignature(pending),
    interactShown,
    resolverHealth: getResolverHealthStatus(),
    pollNow: !!opts.pollNow && alertsOn,
    stewardPushEntitled: stewardPushSubscribeAllowed(getStewardEntitlementsPolicy()),
    stewardPushHealthy: isStewardPushHealthy(),
  };

  active.postMessage(message);

  if ("sync" in reg && opts.pollNow && alertsOn) {
    try {
      await reg.sync.register(SW_SYNC_TAG);
    } catch {
      /* Background Sync unsupported or throttled */
    }
  }

  if ("periodicSync" in reg) {
    try {
      if (alertsOn) {
        const policy = getStewardEntitlementsPolicy();
        await reg.periodicSync.register(SW_PERIODIC_TAG, {
          minInterval: resolveSwPeriodicMinIntervalMs(policy),
        });
      } else {
        await reg.periodicSync.unregister(SW_PERIODIC_TAG);
      }
    } catch {
      /* Periodic sync requires permission / engagement; optional */
    }
  }
}

/**
 * E4d: forward hosted SSE push hints to the live-proof SW when alerts are on.
 *
 * @param {{
 *   profile_id?: string,
 *   qr_id?: string,
 *   challenge_id?: string,
 *   expires_at?: string,
 * }} hint
 * @param {{
 *   pushEntitled?: boolean,
 *   pushHealthy?: boolean,
 * }} [opts]
 * @returns {Promise<void>}
 */
export async function forwardLiveProofPushToServiceWorker(hint, opts = {}) {
  if (!liveProofServiceWorkerSupported()) return;
  if (!isBrowserNotifEnabled() || !notificationGranted()) return;
  if (opts.pushEntitled !== true || opts.pushHealthy !== true) return;

  const profileId =
    typeof hint.profile_id === "string" ? hint.profile_id.trim() : "";
  const challengeId =
    typeof hint.challenge_id === "string" ? hint.challenge_id.trim() : "";
  if (!profileId || !challengeId) return;

  const reg = await registerLiveProofServiceWorker();
  if (!reg) return;
  await navigator.serviceWorker.ready.catch(() => null);
  const active = reg.active || (await reg.installing) || (await reg.waiting);
  if (!active) return;

  active.postMessage({
    type: SW_MESSAGE_LIVE_PROOF_PUSH,
    hint: {
      profile_id: profileId,
      qr_id: typeof hint.qr_id === "string" ? hint.qr_id : "",
      challenge_id: challengeId,
      expires_at: typeof hint.expires_at === "string" ? hint.expires_at : "",
    },
  });
}

/** @returns {Promise<void>} */
export async function teardownLiveProofServiceWorker() {
  if (!liveProofServiceWorkerSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg?.active) return;
  reg.active.postMessage({
    type: "HC_SW_SYNC_STATE",
    enabled: false,
    apiOrigin: "",
    pageOrigin: location.origin,
    entries: [],
    lastSig: "",
    interactShown: false,
    pollNow: false,
  });
  if ("periodicSync" in reg) {
    try {
      await reg.periodicSync.unregister(SW_PERIODIC_TAG);
    } catch {
      /* ignore */
    }
  }
}

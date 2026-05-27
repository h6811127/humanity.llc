/**
 * Service worker registration + state sync for live-proof OS alerts (inbox v2 Phase D).
 * @see docs/DEVICE_INBOX.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { getLiveControlPending } from "./device-live-control-inbox.mjs";
import { liveControlPendingSignature } from "./device-live-control-inbox-core.mjs";
import { isBrowserNotifEnabled } from "./device-browser-notifications-core.mjs";
import { getResolverHealthStatus } from "./device-wallet-since-visit-gate.mjs";
import {
  liveProofPollTargetsFromWallet,
  resolveSwPeriodicMinIntervalMs,
  SW_PERIODIC_TAG,
  SW_SYNC_TAG,
} from "./device-live-control-sw-core.mjs";
import { isWatchLiveProofEnabled } from "./device-hub-network-tools-core.mjs";
import {
  getStewardEntitlementsPolicy,
  stewardPushSubscribeAllowed,
} from "./device-steward-entitlements.mjs";
import {
  PWA_SW_SCRIPT_URL,
  pwaServiceWorkerSupported,
  registerPwaServiceWorker,
} from "./pwa-service-worker.mjs";

export const SW_SCRIPT_URL = PWA_SW_SCRIPT_URL;

/** @returns {boolean} */
export function liveProofServiceWorkerSupported() {
  return pwaServiceWorkerSupported();
}

function notificationGranted() {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

/** @returns {Promise<ServiceWorkerRegistration | null>} */
export async function registerLiveProofServiceWorker() {
  return registerPwaServiceWorker();
}

/** @returns {Promise<void>} */
export async function unregisterLiveProofServiceWorker() {
  await teardownLiveProofServiceWorker();
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
  const pending = getLiveControlPending();
  const message = {
    type: "HC_SW_SYNC_STATE",
    enabled: watchOn,
    watchLiveProofEnabled: watchOn,
    apiOrigin: resolverApiOrigin(),
    pageOrigin: location.origin,
    entries: liveProofPollTargetsFromWallet(loadWallet()),
    lastSig: liveControlPendingSignature(pending),
    interactShown,
    resolverHealth: getResolverHealthStatus(),
    pollNow: !!opts.pollNow && watchOn,
    stewardPushEntitled: stewardPushSubscribeAllowed(getStewardEntitlementsPolicy()),
  };

  active.postMessage(message);

  if ("sync" in reg && opts.pollNow && watchOn) {
    try {
      await reg.sync.register(SW_SYNC_TAG);
    } catch {
      /* Background Sync unsupported or throttled */
    }
  }

  if ("periodicSync" in reg) {
    try {
      if (watchOn) {
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

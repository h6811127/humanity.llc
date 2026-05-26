/**
 * Single debounced refresh pipeline for device OS: health, tab presence, wallet network, live proof.
 * @see docs/DEVICE_OS_QA.md § P1-1
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { fetchResolverHealth } from "./device-network-health.mjs";
import {
  DEVICE_OS_DEBOUNCE_MS,
  shouldRefreshLiveControlInbox,
  shouldRefreshWalletNetwork,
} from "./device-os-coordinator-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  refreshWalletNetworkStatuses,
  snapshotNetworkSeenOnExit,
} from "./device-wallet-network.mjs";
import { syncTabKeysPresence } from "./device-tab-presence.mjs";
import { refreshLiveControlInbox } from "./device-live-control-inbox.mjs";
import { isPollableWalletEntry } from "./device-live-control-inbox-core.mjs";

export const DEVICE_OS_REFRESHED = "hc-device-os-refreshed";

/** @type {'ok' | 'degraded' | 'offline'} */
let lastNetworkStatus = "offline";

let debounceTimer = null;
/** @type {Promise<void> | null} */
let inFlight = null;
/** @type {string | null} */
let pendingReason = null;

export function getCoordinatorNetworkStatus() {
  return lastNetworkStatus;
}

/**
 * @param {string} reason
 * @param {{ immediate?: boolean }} [opts]
 * @returns {Promise<void>}
 */
export function requestDeviceOsRefresh(reason, opts = {}) {
  pendingReason = reason;
  if (opts.immediate) {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    return runDeviceOsRefresh(reason);
  }
  if (debounceTimer != null) clearTimeout(debounceTimer);
  return new Promise((resolve) => {
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      const r = pendingReason ?? reason;
      pendingReason = null;
      void runDeviceOsRefresh(r).then(resolve);
    }, DEVICE_OS_DEBOUNCE_MS);
  });
}

/**
 * @param {string} reason
 * @returns {Promise<void>}
 */
async function runDeviceOsRefresh(reason) {
  if (inFlight) {
    await inFlight;
    if (pendingReason) {
      const next = pendingReason;
      pendingReason = null;
      return runDeviceOsRefresh(next);
    }
    return;
  }

  inFlight = (async () => {
    const entries = loadWallet();

    const [networkStatus, walletResult] = await Promise.all([
      fetchResolverHealth(resolverApiOrigin()),
      shouldRefreshWalletNetwork(reason) && entries.length > 0
        ? new Promise((resolve) => {
            refreshWalletNetworkStatuses(entries, (result) => resolve(result));
          })
        : Promise.resolve(null),
      Promise.resolve().then(() => syncTabKeysPresence()),
    ]);

    lastNetworkStatus = networkStatus;

    if (
      shouldRefreshLiveControlInbox(reason) &&
      entries.some((e) => isPollableWalletEntry(e))
    ) {
      await refreshLiveControlInbox();
    }

    window.dispatchEvent(
      new CustomEvent(DEVICE_OS_REFRESHED, {
        detail: {
          reason,
          networkStatus,
          wallet: walletResult,
        },
      })
    );
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}

const STORAGE_KEYS = new Set([
  "hc_wallet",
  "hc_device_pins",
  "hc_created",
  "hc_device_activity",
  "hc_tab_keys_presence",
]);

let coordinatorStarted = false;

export function initDeviceOsCoordinator() {
  if (coordinatorStarted) return;
  coordinatorStarted = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      snapshotNetworkSeenOnExit();
      return;
    }
    if (document.visibilityState === "visible") {
      void requestDeviceOsRefresh("visible");
    }
  });

  window.addEventListener("pagehide", () => snapshotNetworkSeenOnExit());

  window.addEventListener("storage", (e) => {
    if (e.key && STORAGE_KEYS.has(e.key)) {
      void requestDeviceOsRefresh("storage");
    }
  });

  window.addEventListener("hc-device-hub-changed", () => {
    void requestDeviceOsRefresh("hub-changed");
  });

  void requestDeviceOsRefresh("init");
}

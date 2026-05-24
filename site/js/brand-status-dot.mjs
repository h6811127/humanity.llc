/**
 * Brand pass-dot: network reachability + this-device key state.
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import { loadWallet, isWalletSaved } from "./device-wallet.mjs";

const NETWORK_CLASSES = [
  "pass-dot-status-network-ok",
  "pass-dot-status-network-degraded",
  "pass-dot-status-network-offline",
];
const DEVICE_CLASSES = [
  "pass-dot-status-device-none",
  "pass-dot-status-device-keys",
  "pass-dot-status-device-unsaved",
];

function getTabSession() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasUnsavedTabKeys() {
  const session = getTabSession();
  if (!session?.profile_id || !session?.owner_private_key_b58) return false;
  return !isWalletSaved(session.profile_id);
}

function deviceState() {
  const saved = loadWallet().length;
  if (hasUnsavedTabKeys()) return "unsaved";
  if (saved > 0) return "keys";
  return "none";
}

function applyDot(dot, network, device) {
  if (!dot) return;
  dot.classList.remove(...NETWORK_CLASSES, ...DEVICE_CLASSES);
  dot.classList.add(`pass-dot-status-network-${network}`);
  dot.classList.add(`pass-dot-status-device-${device}`);

  const networkLabel =
    network === "ok"
      ? "Network reachable"
      : network === "degraded"
        ? "Network degraded"
        : "Network unreachable";

  const deviceLabel =
    device === "unsaved"
      ? "Keys in this tab — not saved on device"
      : device === "keys"
        ? `${savedCountLabel()} on this device`
        : "No saved keys on this device";

  dot.setAttribute("title", `${networkLabel} · ${deviceLabel}`);
}

function savedCountLabel() {
  const n = loadWallet().length;
  return n === 1 ? "1 saved card" : `${n} saved cards`;
}

async function fetchNetworkStatus() {
  const url = new URL("/.well-known/hc/v1/health", resolverApiOrigin()).href;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status === "degraded") return "degraded";
    return "ok";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timer);
  }
}

let networkStatus = "offline";

function refreshDevice() {
  const dot = document.querySelector(".top-brand .pass-dot");
  applyDot(dot, networkStatus, deviceState());
}

async function refreshAll() {
  const dot = document.querySelector(".top-brand .pass-dot");
  if (!dot) return;
  networkStatus = await fetchNetworkStatus();
  applyDot(dot, networkStatus, deviceState());
}

refreshAll();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshAll();
});

window.addEventListener("storage", (e) => {
  if (e.key === "hc_wallet" || e.key === "hc_created") refreshDevice();
});

window.addEventListener("hc-device-hub-changed", refreshDevice);

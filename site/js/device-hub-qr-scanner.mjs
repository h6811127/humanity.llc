/**
 * Hub in-app QR scanner — scan printed QRs without leaving the PWA (S3).
 */
import {
  HUB_CHROME_SCAN_QR_ARIA,
  HUB_SCAN_QR_BTN,
  HUB_SCAN_QR_DIALOG_LEAD,
  HUB_SCAN_QR_DIALOG_TITLE,
  HUB_SCAN_QR_PERMISSION_DENIED,
  HUB_SCAN_QR_UNSUPPORTED,
} from "./device-ownership-copy-core.mjs";
import {
  pickQrScanBackend,
  resolveScannedQrToScanUrl,
  shouldShowHubQrScanner,
  shouldShowHubScanQrChrome,
} from "./device-hub-qr-scanner-core.mjs";
import { waitForVideoScanReady } from "./device-hub-qr-scanner-decode-core.mjs";
import {
  startHybridDetectLoop,
  startJsQrDetectLoop,
  startNativeDetectLoop,
} from "./device-hub-qr-scanner-decode.mjs";
import { getTabSession } from "./device-keys.mjs";
import { hasStewardVerification } from "./device-dot-state-core.mjs";
import { getWalletCount, loadWalletSummary } from "./device-wallet.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/** @type {MediaStream | null} */
let activeStream = null;
/** @type {(() => void) | null} */
let stopScanLoop = null;
let bound = false;

function scannerDialog() {
  return document.getElementById("device-hub-qr-scanner");
}

function scannerVideo() {
  return document.getElementById("device-hub-qr-scanner-video");
}

function scannerStatus() {
  return document.getElementById("device-hub-qr-scanner-status");
}

function scannerVideoWrap() {
  return document.querySelector(".device-hub-qr-scanner-video-wrap");
}

function setScannerStatus(msg, isError = false) {
  const el = scannerStatus();
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg;
  el.className = isError ? "form-status error" : "form-status";
}

function setScannerCameraUi(active) {
  const dialog = scannerDialog();
  const wrap = scannerVideoWrap();
  if (dialog) dialog.classList.toggle("device-hub-qr-scanner--no-camera", !active);
  if (wrap) wrap.hidden = !active;
}

async function stopCamera() {
  stopScanLoop?.();
  stopScanLoop = null;
  if (activeStream) {
    for (const track of activeStream.getTracks()) {
      track.stop();
    }
    activeStream = null;
  }
  const video = scannerVideo();
  if (video) video.srcObject = null;
}

function closeScannerDialog() {
  const dialog = scannerDialog();
  void stopCamera();
  setScannerStatus("");
  setScannerCameraUi(true);
  dialog?.classList.remove("device-hub-qr-scanner--no-camera");
  dialog?.close();
}

function onScanUrlFound(url) {
  const dialog = scannerDialog();
  void stopCamera();
  setScannerStatus("Scan found — opening…");
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  dialog?.close();
  window.location.assign(url);
}

async function openScannerDialog() {
  const dialog = scannerDialog();
  const video = scannerVideo();
  if (!dialog || !video) return;

  const backend = pickQrScanBackend();
  if (!backend) {
    setScannerCameraUi(false);
    setScannerStatus(HUB_SCAN_QR_UNSUPPORTED, true);
    dialog.showModal();
    return;
  }

  const title = dialog.querySelector("#device-hub-qr-scanner-title");
  const lead = dialog.querySelector("#device-hub-qr-scanner-lead");
  if (title) title.textContent = HUB_SCAN_QR_DIALOG_TITLE;
  if (lead) lead.textContent = HUB_SCAN_QR_DIALOG_LEAD;
  setScannerCameraUi(true);
  setScannerStatus("Starting camera…");
  dialog.showModal();

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
      audio: false,
    });
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.srcObject = activeStream;
    await video.play();
    await waitForVideoScanReady(video);

    const onRaw = (raw) => {
      const url = resolveScannedQrToScanUrl(raw, location.origin);
      if (url) onScanUrlFound(url);
    };

    if (backend === "native") {
      stopScanLoop = startNativeDetectLoop(video, onRaw);
      if (!stopScanLoop) {
        stopScanLoop = await startJsQrDetectLoop(video, onRaw);
      }
    } else if (backend === "hybrid") {
      stopScanLoop = await startHybridDetectLoop(video, onRaw);
    } else {
      stopScanLoop = await startJsQrDetectLoop(video, onRaw);
    }
    setScannerStatus("Point at a humanity.llc scan QR");
  } catch (err) {
    setScannerCameraUi(false);
    const denied =
      err instanceof DOMException &&
      (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
    setScannerStatus(denied ? HUB_SCAN_QR_PERMISSION_DENIED : HUB_SCAN_QR_UNSUPPORTED, true);
  }
}

function hubQrScannerOpts() {
  const session = getTabSession();
  const summary = loadWalletSummary();
  return {
    stewardReady: summary.stewardReady || hasStewardVerification(session),
    hasTabSigningKeys: Boolean(session?.owner_private_key_b58),
  };
}

function syncHubScanQrSurfaces() {
  const walletCount = getWalletCount();
  const stewardOpts = hubQrScannerOpts();
  const showHub = shouldShowHubQrScanner(walletCount, stewardOpts);
  const showChrome = shouldShowHubScanQrChrome({
    walletCount,
    standalone: readStandaloneModeFromWindow(window),
    ...stewardOpts,
  });
  const btn = document.getElementById("hub-scan-qr-btn");
  const strip = document.getElementById("device-hub-steward-tools");
  const chromeBtn = document.getElementById("shell-scan-qr-btn");
  if (btn) {
    btn.textContent = HUB_SCAN_QR_BTN;
    btn.hidden = !showHub;
  }
  if (strip) strip.hidden = !showHub;
  if (chromeBtn) {
    chromeBtn.hidden = !showChrome;
    chromeBtn.setAttribute("aria-label", HUB_CHROME_SCAN_QR_ARIA);
  }
}

function bindScannerChrome() {
  if (bound) return;
  bound = true;

  const dialog = scannerDialog();
  dialog?.querySelector("[data-hub-qr-scanner-close]")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeScannerDialog();
  });
  dialog?.addEventListener("close", () => {
    void stopCamera();
    setScannerStatus("");
    setScannerCameraUi(true);
  });
  dialog?.addEventListener("cancel", () => {
    void stopCamera();
  });

  document.getElementById("hub-scan-qr-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void openScannerDialog();
  });

  document.getElementById("shell-scan-qr-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void openScannerDialog();
  });

  document.addEventListener("hc-device-hub-changed", syncHubScanQrSurfaces);
  window.addEventListener("hc-device-os-refreshed", syncHubScanQrSurfaces);
  window.matchMedia("(display-mode: standalone)")?.addEventListener("change", syncHubScanQrSurfaces);
  syncHubScanQrSurfaces();
}

/**
 * @param {Document | HTMLElement | null} [root]
 */
export function initHubQrScanner(root) {
  bindScannerChrome();
  if (root && root !== document) {
    syncHubScanQrSurfaces();
  }
}

bindScannerChrome();

export {
  syncHubScanQrSurfaces as syncHubQrScannerButtonForTests,
  closeScannerDialog,
  openScannerDialog as openHubQrScanner,
};

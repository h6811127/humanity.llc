/**
 * Hub in-app QR scanner — scan printed QRs without leaving the PWA (S3).
 */
import {
  HUB_CHROME_SCAN_QR_ARIA,
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
import { prefersReducedMotion } from "./device-shell-motion.mjs";

/** @type {MediaStream | null} */
let activeStream = null;
/** @type {(() => void) | null} */
let stopScanLoop = null;
let bound = false;

const SCANNER_CLOSE_MS = 280;

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

function scannerInner() {
  return document.querySelector(".device-hub-qr-scanner-inner");
}

function resetScannerDialogPresentation() {
  const dialog = scannerDialog();
  if (!dialog) return;
  dialog.classList.remove("device-hub-qr-scanner--present", "device-hub-qr-scanner--closing");
  scannerInner()?.style.removeProperty("transform-origin");
}

function syncScannerDialogOrigin() {
  const inner = scannerInner();
  const btn = document.getElementById("shell-scan-qr-btn");
  if (!inner || !btn || btn.hidden) {
    inner?.style.removeProperty("transform-origin");
    return;
  }
  const btnRect = btn.getBoundingClientRect();
  const innerRect = inner.getBoundingClientRect();
  const originX = btnRect.left + btnRect.width / 2 - innerRect.left;
  const originY = btnRect.top + btnRect.height / 2 - innerRect.top;
  inner.style.transformOrigin = `${Math.round(originX)}px ${Math.round(originY)}px`;
}

function revealScannerPresentation() {
  const dialog = scannerDialog();
  if (!dialog?.open) return;

  if (prefersReducedMotion()) {
    dialog.classList.add("device-hub-qr-scanner--present");
    return;
  }

  requestAnimationFrame(() => {
    syncScannerDialogOrigin();
    void scannerInner()?.offsetWidth;
    requestAnimationFrame(() => {
      dialog.classList.add("device-hub-qr-scanner--present");
    });
  });
}

function showScannerModal() {
  const dialog = scannerDialog();
  if (!dialog) return;
  resetScannerDialogPresentation();
  window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  dialog.showModal();
  revealScannerPresentation();
}

function finishScannerClose() {
  const dialog = scannerDialog();
  resetScannerDialogPresentation();
  void stopCamera();
  setScannerStatus("");
  setScannerCameraUi(true);
  dialog?.classList.remove("device-hub-qr-scanner--no-camera");
  if (dialog?.open) dialog.close();
}

function closeScannerDialog() {
  const dialog = scannerDialog();
  if (!dialog?.open) return;
  if (dialog.classList.contains("device-hub-qr-scanner--closing")) return;

  if (prefersReducedMotion() || !dialog.classList.contains("device-hub-qr-scanner--present")) {
    finishScannerClose();
    return;
  }

  dialog.classList.remove("device-hub-qr-scanner--present");
  dialog.classList.add("device-hub-qr-scanner--closing");
  const inner = scannerInner();
  let closed = false;
  const done = () => {
    if (closed) return;
    closed = true;
    finishScannerClose();
  };
  const onTransitionEnd = (event) => {
    if (event.target !== inner || event.propertyName !== "opacity") return;
    inner?.removeEventListener("transitionend", onTransitionEnd);
    done();
  };
  inner?.addEventListener("transitionend", onTransitionEnd);
  window.setTimeout(done, SCANNER_CLOSE_MS + 60);
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
    showScannerModal();
    return;
  }

  const title = dialog.querySelector("#device-hub-qr-scanner-title");
  const lead = dialog.querySelector("#device-hub-qr-scanner-lead");
  if (title) title.textContent = HUB_SCAN_QR_DIALOG_TITLE;
  if (lead) lead.textContent = HUB_SCAN_QR_DIALOG_LEAD;
  setScannerCameraUi(true);
  setScannerStatus("Starting camera…");
  showScannerModal();

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
  const showChrome = shouldShowHubScanQrChrome({
    walletCount,
    standalone: readStandaloneModeFromWindow(window),
    ...stewardOpts,
  });
  const chromeBtn = document.getElementById("shell-scan-qr-btn");
  if (chromeBtn) {
    chromeBtn.hidden = !showChrome;
    chromeBtn.setAttribute("aria-label", HUB_CHROME_SCAN_QR_ARIA);
  }
}

function bindScannerChrome() {
  if (bound) return;
  bound = true;

  const dialog = scannerDialog();
  dialog?.addEventListener("click", (e) => {
    const closeTarget = e.target.closest("[data-hub-qr-scanner-close]");
    if (!closeTarget) return;
    e.preventDefault();
    closeScannerDialog();
  });
  dialog?.addEventListener("close", () => {
    resetScannerDialogPresentation();
    void stopCamera();
    setScannerStatus("");
    setScannerCameraUi(true);
  });
  dialog?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeScannerDialog();
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

/**
 * Hub in-app QR scanner — scan printed QRs without leaving the PWA (S3).
 */
import {
  HUB_SCAN_QR_BTN,
  HUB_SCAN_QR_DIALOG_LEAD,
  HUB_SCAN_QR_DIALOG_TITLE,
  HUB_SCAN_QR_PERMISSION_DENIED,
  HUB_SCAN_QR_UNSUPPORTED,
} from "./device-ownership-copy-core.mjs";
import {
  barcodeDetectorSupported,
  resolveScannedQrToScanUrl,
  shouldShowHubQrScanner,
} from "./device-hub-qr-scanner-core.mjs";
import { getWalletCount } from "./device-wallet.mjs";

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

function setScannerStatus(msg, isError = false) {
  const el = scannerStatus();
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg;
  el.className = isError ? "form-status error" : "form-status";
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
  dialog?.close();
}

/**
 * @param {BarcodeDetector} detector
 * @param {HTMLVideoElement} video
 * @param {(url: string) => void} onFound
 */
function startDetectLoop(detector, video, onFound) {
  let stopped = false;
  const tick = async () => {
    if (stopped || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (!stopped) requestAnimationFrame(tick);
      return;
    }
    try {
      const codes = await detector.detect(video);
      for (const code of codes) {
        const url = resolveScannedQrToScanUrl(code.rawValue, location.origin);
        if (url) {
          stopped = true;
          onFound(url);
          return;
        }
      }
    } catch {
      /* frame not ready */
    }
    if (!stopped) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    stopped = true;
  };
}

async function openScannerDialog() {
  const dialog = scannerDialog();
  const video = scannerVideo();
  if (!dialog || !video) return;

  if (!barcodeDetectorSupported()) {
    setScannerStatus(HUB_SCAN_QR_UNSUPPORTED, true);
    dialog.showModal();
    return;
  }

  const title = dialog.querySelector("#device-hub-qr-scanner-title");
  const lead = dialog.querySelector("#device-hub-qr-scanner-lead");
  if (title) title.textContent = HUB_SCAN_QR_DIALOG_TITLE;
  if (lead) lead.textContent = HUB_SCAN_QR_DIALOG_LEAD;
  setScannerStatus("Starting camera…");
  dialog.showModal();

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    video.srcObject = activeStream;
    await video.play();
    const detector = new globalThis.BarcodeDetector({ formats: ["qr_code"] });
    stopScanLoop = startDetectLoop(detector, video, (url) => {
      void stopCamera();
      setScannerStatus("Scan found — opening…");
      window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
      dialog.close();
      window.location.assign(url);
    });
    setScannerStatus("Point at a humanity.llc scan QR");
  } catch (err) {
    const denied =
      err instanceof DOMException &&
      (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
    setScannerStatus(denied ? HUB_SCAN_QR_PERMISSION_DENIED : HUB_SCAN_QR_UNSUPPORTED, true);
  }
}

function syncScanQrButtonVisibility() {
  const btn = document.getElementById("hub-scan-qr-btn");
  if (!btn) return;
  btn.textContent = HUB_SCAN_QR_BTN;
  btn.hidden = !shouldShowHubQrScanner(getWalletCount());
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
  });
  dialog?.addEventListener("cancel", () => {
    void stopCamera();
  });

  document.getElementById("hub-scan-qr-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    void openScannerDialog();
  });

  document.addEventListener("hc-device-hub-changed", syncScanQrButtonVisibility);
  window.addEventListener("hc-device-os-refreshed", syncScanQrButtonVisibility);
  syncScanQrButtonVisibility();
}

/**
 * @param {Document | HTMLElement | null} [root]
 */
export function initHubQrScanner(root) {
  bindScannerChrome();
  if (root && root !== document) {
    syncScanQrButtonVisibility();
  }
}

bindScannerChrome();

export { syncScanQrButtonVisibility as syncHubQrScannerButtonForTests, closeScannerDialog };

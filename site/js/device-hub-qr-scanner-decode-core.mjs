/**
 * QR scan backend selection + jsQR frame decode (Safari / iOS / Android fallback).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md S3
 */

/** Max canvas edge for decode — full camera frames choke jsQR on mobile. */
export const SCAN_FRAME_MAX_DIMENSION = 640;

export function barcodeDetectorSupported() {
  return typeof globalThis.BarcodeDetector === "function";
}

export function hubCameraScanSupported() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** Android Chrome exposes BarcodeDetector but in-app video decode is unreliable alone. */
export function isAndroidUserAgent() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/** @returns {'native' | 'hybrid' | 'jsqr' | null} */
export function pickQrScanBackend() {
  if (isAndroidUserAgent() && hubCameraScanSupported()) return "hybrid";
  if (barcodeDetectorSupported()) return "native";
  if (hubCameraScanSupported()) return "jsqr";
  return null;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} [maxDimension]
 */
export function scaleScanFrameDimensions(width, height, maxDimension = SCAN_FRAME_MAX_DIMENSION) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) return { width, height };
  const scale = maxDimension / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * @param {HTMLVideoElement} video
 */
export function isVideoScanFrameReady(video) {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

/**
 * @param {HTMLVideoElement} video
 * @param {number} [timeoutMs]
 */
export function waitForVideoScanReady(video, timeoutMs = 8000) {
  if (isVideoScanFrameReady(video)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Camera preview not ready"));
    }, timeoutMs);
    const onReady = () => {
      if (isVideoScanFrameReady(video)) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("resize", onReady);
      video.removeEventListener("loadeddata", onReady);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("resize", onReady);
    video.addEventListener("loadeddata", onReady);
    onReady();
  });
}

/**
 * @param {string | null | undefined} raw
 */
export function normalizeScannedQrPayload(raw) {
  return String(raw ?? "")
    .replace(/\0/g, "")
    .trim();
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {number} [maxDimension]
 * @returns {{ ctx: CanvasRenderingContext2D, width: number, height: number } | null}
 */
export function drawVideoScanFrame(video, canvas, maxDimension = SCAN_FRAME_MAX_DIMENSION) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;
  const { width, height } = scaleScanFrameDimensions(sourceWidth, sourceHeight, maxDimension);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return { ctx, width, height };
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {(data: Uint8ClampedArray, width: number, height: number) => { data: string } | null} jsQr
 * @returns {string | null}
 */
export function decodeQrFromImageData(data, width, height, jsQr) {
  if (!jsQr || width <= 0 || height <= 0) return null;
  const result = jsQr(data, width, height, { inversionAttempts: "attemptBoth" });
  const raw = result?.data ? normalizeScannedQrPayload(result.data) : "";
  return raw || null;
}

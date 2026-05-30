/**
 * Lazy-load jsQR for Safari / iOS / Android; canvas BarcodeDetector on desktop Chromium.
 */
import {
  barcodeDetectorSupported,
  decodeQrFromImageData,
  drawVideoScanFrame,
  isVideoScanFrameReady,
} from "./device-hub-qr-scanner-decode-core.mjs";

/** @type {Promise<(data: Uint8ClampedArray, width: number, height: number, opts?: object) => { data: string } | null> | null} */
let jsQrLoadPromise = null;

/**
 * @returns {Promise<(data: Uint8ClampedArray, width: number, height: number, opts?: object) => { data: string } | null>}
 */
export function ensureJsQrLoaded() {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("jsQR requires a browser document"));
  }
  const existing = globalThis.jsQR;
  if (existing) {
    const fn = existing.default ?? existing;
    return Promise.resolve(fn);
  }
  if (!jsQrLoadPromise) {
    jsQrLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/js/vendor/jsqr.js?v=1";
      script.async = true;
      script.onload = () => {
        const mod = globalThis.jsQR;
        const fn = mod?.default ?? mod;
        if (typeof fn !== "function") {
          reject(new Error("jsQR failed to load"));
          return;
        }
        resolve(fn);
      };
      script.onerror = () => reject(new Error("jsQR script failed to load"));
      document.head.appendChild(script);
    });
  }
  return jsQrLoadPromise;
}

/**
 * @param {HTMLVideoElement} video
 * @param {(time: number) => void} callback
 */
function scheduleVideoScanFrame(video, callback) {
  if (typeof video.requestVideoFrameCallback === "function") {
    video.requestVideoFrameCallback((_now, _metadata) => {
      callback(performance.now());
    });
    return;
  }
  requestAnimationFrame(callback);
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {(data: Uint8ClampedArray, width: number, height: number, opts?: object) => { data: string } | null} jsQr
 * @returns {string | null}
 */
export function decodeQrFromVideoFrame(video, canvas, jsQr) {
  const frame = drawVideoScanFrame(video, canvas);
  if (!frame) return null;
  const imageData = frame.ctx.getImageData(0, 0, frame.width, frame.height);
  return decodeQrFromImageData(imageData.data, frame.width, frame.height, jsQr);
}

/**
 * @returns {BarcodeDetector | null}
 */
export function createBarcodeDetector() {
  if (!barcodeDetectorSupported()) return null;
  try {
    return new globalThis.BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    try {
      return new globalThis.BarcodeDetector();
    } catch {
      return null;
    }
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {BarcodeDetector} detector
 * @returns {Promise<string | null>}
 */
export async function decodeNativeFromVideoFrame(video, canvas, detector) {
  const frame = drawVideoScanFrame(video, canvas);
  if (!frame) return null;
  const codes = await detector.detect(canvas);
  for (const code of codes) {
    const raw = code?.rawValue;
    if (raw) return String(raw).trim();
  }
  return null;
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 * @param {BarcodeDetector | null} detector
 * @param {(data: Uint8ClampedArray, width: number, height: number, opts?: object) => { data: string } | null} jsQr
 * @returns {Promise<string | null>}
 */
export async function decodeHybridFromVideoFrame(video, canvas, detector, jsQr) {
  const frame = drawVideoScanFrame(video, canvas);
  if (!frame) return null;
  if (detector) {
    try {
      const codes = await detector.detect(canvas);
      for (const code of codes) {
        const raw = code?.rawValue;
        if (raw) return String(raw).trim();
      }
    } catch {
      /* try jsQR below */
    }
  }
  const imageData = frame.ctx.getImageData(0, 0, frame.width, frame.height);
  return decodeQrFromImageData(imageData.data, frame.width, frame.height, jsQr);
}

/**
 * @param {HTMLVideoElement} video
 * @param {(raw: string) => void} onFound
 * @param {(video: HTMLVideoElement, cb: (time: number) => void) => void} schedule
 * @param {(video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>} decodeFrame
 * @returns {() => void}
 */
function startScanDetectLoop(video, onFound, schedule, decodeFrame) {
  const canvas = document.createElement("canvas");
  let stopped = false;
  let inFlight = false;
  let lastTick = 0;
  const intervalMs = 120;

  const tick = async (now) => {
    if (stopped) return;
    if (
      !inFlight &&
      now - lastTick >= intervalMs &&
      isVideoScanFrameReady(video)
    ) {
      lastTick = now;
      inFlight = true;
      try {
        const raw = await decodeFrame(video, canvas);
        if (raw) {
          stopped = true;
          onFound(raw);
          return;
        }
      } catch {
        /* frame not ready */
      } finally {
        inFlight = false;
      }
    }
    if (!stopped) schedule(video, tick);
  };
  schedule(video, tick);
  return () => {
    stopped = true;
  };
}

/**
 * @param {HTMLVideoElement} video
 * @param {(raw: string) => void} onFound
 * @returns {(() => void) | null}
 */
export function startNativeDetectLoop(video, onFound) {
  const detector = createBarcodeDetector();
  if (!detector) return null;
  return startScanDetectLoop(
    video,
    onFound,
    scheduleVideoScanFrame,
    (v, canvas) => decodeNativeFromVideoFrame(v, canvas, detector)
  );
}

/**
 * @param {HTMLVideoElement} video
 * @param {(raw: string) => void} onFound
 * @returns {Promise<() => void>}
 */
export async function startJsQrDetectLoop(video, onFound) {
  const jsQr = await ensureJsQrLoaded();
  return startScanDetectLoop(
    video,
    onFound,
    scheduleVideoScanFrame,
    async (v, canvas) => decodeQrFromVideoFrame(v, canvas, jsQr)
  );
}

/**
 * Android — native canvas + jsQR on the same downscaled frame.
 * @param {HTMLVideoElement} video
 * @param {(raw: string) => void} onFound
 * @returns {Promise<() => void>}
 */
export async function startHybridDetectLoop(video, onFound) {
  const [jsQr, detector] = await Promise.all([
    ensureJsQrLoaded(),
    Promise.resolve(createBarcodeDetector()),
  ]);
  return startScanDetectLoop(
    video,
    onFound,
    scheduleVideoScanFrame,
    (v, canvas) => decodeHybridFromVideoFrame(v, canvas, detector, jsQr)
  );
}

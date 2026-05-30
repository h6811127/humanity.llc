/**
 * Lazy-load jsQR for Safari / iOS where BarcodeDetector is missing.
 */
import { decodeQrFromImageData } from "./device-hub-qr-scanner-decode-core.mjs";

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
      script.src = "/js/vendor/jsqr.js";
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
 * @param {HTMLCanvasElement} canvas
 * @param {(data: Uint8ClampedArray, width: number, height: number, opts?: object) => { data: string } | null} jsQr
 * @returns {string | null}
 */
export function decodeQrFromVideoFrame(video, canvas, jsQr) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return decodeQrFromImageData(imageData.data, w, h, jsQr);
}

/**
 * @param {HTMLVideoElement} video
 * @param {(raw: string) => void} onFound
 * @returns {Promise<() => void>}
 */
export async function startJsQrDetectLoop(video, onFound) {
  const jsQr = await ensureJsQrLoaded();
  const canvas = document.createElement("canvas");
  let stopped = false;
  let lastTick = 0;
  const intervalMs = 180;

  const tick = (now) => {
    if (stopped) return;
    if (now - lastTick >= intervalMs) {
      lastTick = now;
      try {
        const raw = decodeQrFromVideoFrame(video, canvas, jsQr);
        if (raw) {
          stopped = true;
          onFound(raw);
          return;
        }
      } catch {
        /* frame not ready */
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    stopped = true;
  };
}

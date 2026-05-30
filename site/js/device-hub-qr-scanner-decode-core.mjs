/**
 * QR scan backend selection + jsQR frame decode (Safari / iOS fallback).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md S3
 */

export function barcodeDetectorSupported() {
  return typeof globalThis.BarcodeDetector === "function";
}

export function hubCameraScanSupported() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/** @returns {'native' | 'jsqr' | null} */
export function pickQrScanBackend() {
  if (barcodeDetectorSupported()) return "native";
  if (hubCameraScanSupported()) return "jsqr";
  return null;
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
  const result = jsQr(data, width, height, { inversionAttempts: "dontInvert" });
  return result?.data ? String(result.data) : null;
}

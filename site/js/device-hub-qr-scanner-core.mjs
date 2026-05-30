/**
 * In-app hub QR scanner (S3 · steward vouch from PWA).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md
 */

import { validateOfficialScanUrl } from "./qr-scan-url-lock.mjs";

/**
 * @param {number} [walletCount]
 */
export function shouldShowHubQrScanner(walletCount = 0) {
  return walletCount >= 1;
}

export function barcodeDetectorSupported() {
  return typeof globalThis.BarcodeDetector === "function";
}

/**
 * @param {string | null | undefined} raw
 * @param {string} [defaultOrigin]
 * @returns {string | null}
 */
export function resolveScannedQrToScanUrl(raw, defaultOrigin = "https://humanity.llc") {
  let candidate = String(raw ?? "").trim();
  if (!candidate) return null;

  if (!/^https?:\/\//i.test(candidate)) {
    const path = candidate.startsWith("/c/") ? candidate : `/c/${candidate}`;
    try {
      candidate = new URL(path, defaultOrigin).href;
    } catch {
      return null;
    }
  }

  const result = validateOfficialScanUrl(candidate);
  if (!result.ok) return null;
  return candidate;
}

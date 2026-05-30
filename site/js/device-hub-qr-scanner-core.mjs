/**
 * In-app hub QR scanner (S3 · steward vouch from PWA).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md
 */

import { validateOfficialScanUrl } from "./qr-scan-url-lock.mjs";
import { normalizeScannedQrPayload } from "./device-hub-qr-scanner-decode-core.mjs";
export {
  barcodeDetectorSupported,
  hubCameraScanSupported,
  pickQrScanBackend,
} from "./device-hub-qr-scanner-decode-core.mjs";

/**
 * @param {number} [walletCount]
 * @param {{ stewardReady?: boolean, hasTabSigningKeys?: boolean }} [opts]
 */
export function shouldShowHubQrScanner(walletCount = 0, opts = {}) {
  if (walletCount >= 1) return true;
  return Boolean(opts.stewardReady && opts.hasTabSigningKeys);
}

/**
 * Phase B — muted top-chrome scan icon (standalone PWA stewards only).
 * @param {{ walletCount?: number; standalone?: boolean }} [input]
 */
export function shouldShowHubScanQrChrome(input = {}) {
  const walletCount = input.walletCount ?? 0;
  return (
    shouldShowHubQrScanner(walletCount, {
      stewardReady: input.stewardReady,
      hasTabSigningKeys: input.hasTabSigningKeys,
    }) && input.standalone === true
  );
}

/**
 * @param {string | null | undefined} raw
 * @param {string} [defaultOrigin]
 * @returns {string | null}
 */
export function resolveScannedQrToScanUrl(raw, defaultOrigin = "https://humanity.llc") {
  let candidate = normalizeScannedQrPayload(raw);
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

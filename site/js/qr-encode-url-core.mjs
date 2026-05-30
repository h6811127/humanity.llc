/**
 * Shared QR payload guards — official scan URLs and steward handoff `/v/{code}` (S7 / RC-1).
 * @see docs/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md
 */

import { assertOfficialScanUrl } from "./qr-scan-url-lock.mjs";
import {
  credentialCodeFromScanUrl,
  deriveCredentialCodeSync,
} from "./qr-credential-code.mjs";
import { isAllowedStewardHandoffEncodeUrl } from "./steward-dual-qr-core.mjs";
import { decodeStewardHandoffCode } from "./steward-handoff-code-core.mjs";

/**
 * @param {string} text
 */
export function assertQrEncodeUrl(text) {
  if (!text?.trim()) throw new Error("No URL to encode");
  try {
    assertOfficialScanUrl(text);
    return;
  } catch {
    if (isAllowedStewardHandoffEncodeUrl(text)) return;
    throw new Error("URL is not an official scan or steward handoff link");
  }
}

/**
 * HC-XXXX-XXXX footer for branded frame — scan URL or decoded handoff code.
 * @param {string} text
 * @returns {string | null}
 */
export function credentialCodeForEncodeUrl(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const fromScan = credentialCodeFromScanUrl(raw);
  if (fromScan) return fromScan;
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/v\/([^/]+)$/);
    if (!match?.[1]) return null;
    const parts = decodeStewardHandoffCode(match[1]);
    if (!parts) return null;
    return deriveCredentialCodeSync(parts.profileId, parts.qrId);
  } catch {
    return null;
  }
}

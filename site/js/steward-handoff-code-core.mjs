/**
 * Compact steward handoff URL codes for `/v/{code}` (S6).
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § S6
 */

import { validateOfficialScanUrl } from "./qr-scan-url-lock.mjs";

const PROFILE_ID_PATTERN = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20,32}$/;
const QR_ID_PATTERN = /^qr_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

/**
 * @param {string} text
 */
function base64UrlEncodeUtf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * @param {string} encoded
 */
function base64UrlDecodeUtf8(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * @param {string} profileId
 * @param {string} qrId
 */
export function encodeStewardHandoffCode(profileId, qrId) {
  const pid = String(profileId ?? "").trim();
  const qid = String(qrId ?? "").trim();
  if (!PROFILE_ID_PATTERN.test(pid) || !QR_ID_PATTERN.test(qid)) return null;
  return base64UrlEncodeUtf8(`${pid}:${qid}`);
}

/**
 * @param {string | null | undefined} code
 * @returns {{ profileId: string; qrId: string } | null}
 */
export function decodeStewardHandoffCode(code) {
  const raw = String(code ?? "").trim();
  if (!raw || raw.length > 128) return null;
  try {
    const decoded = base64UrlDecodeUtf8(raw);
    const sep = decoded.indexOf(":");
    if (sep <= 0) return null;
    const profileId = decoded.slice(0, sep).trim();
    const qrId = decoded.slice(sep + 1).trim();
    if (!PROFILE_ID_PATTERN.test(profileId) || !QR_ID_PATTERN.test(qrId)) return null;
    return { profileId, qrId };
  } catch {
    return null;
  }
}

/**
 * @param {string} scanUrl
 * @param {string} [origin]
 * @returns {{ profileId: string; qrId: string } | null}
 */
export function parseStewardHandoffScanParts(scanUrl, origin = "https://humanity.llc") {
  const href = String(scanUrl ?? "").trim();
  if (!href) return null;
  try {
    const url = new URL(href, origin);
    const match = url.pathname.match(/^\/c\/([^/]+)$/);
    if (!match?.[1]) return null;
    const qrId = url.searchParams.get("q")?.trim() ?? "";
    if (!qrId) return null;
    const check = validateOfficialScanUrl(url.href);
    if (!check.ok) return null;
    return { profileId: match[1], qrId };
  } catch {
    return null;
  }
}

/**
 * @param {string} scanUrl
 * @param {string} [origin]
 * @returns {string | null}
 */
export function buildStewardHandoffShortUrl(scanUrl, origin = "https://humanity.llc") {
  const parts = parseStewardHandoffScanParts(scanUrl, origin);
  if (!parts) return null;
  const code = encodeStewardHandoffCode(parts.profileId, parts.qrId);
  if (!code) return null;
  const base = String(origin ?? "https://humanity.llc").replace(/\/$/, "");
  return `${base}/v/${code}`;
}

/**
 * @param {{ profileId: string; qrId: string }} parts
 * @param {string} [origin]
 */
export function buildStewardHandoffScanUrl(parts, origin = "https://humanity.llc") {
  const base = String(origin ?? "https://humanity.llc").replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(parts.profileId)}?q=${encodeURIComponent(parts.qrId)}`;
}

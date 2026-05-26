/**
 * Short human-readable credential fingerprint (SCANNER_EXPERIENCE Phase F).
 * Derived from profile_id + qr_id — not secret; for print QA and verifier comparison.
 */

import { validateOfficialScanUrl } from "./qr-scan-url-lock.mjs";

/** Crockford base32 without I, L, O, U */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const CREDENTIAL_CODE_PREFIX = "HC";

export const CREDENTIAL_CODE_PATTERN =
  /^HC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

/**
 * @param {string} text
 */
function fnv1a64(text) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  return hash;
}

/**
 * @param {bigint} hash
 */
function formatCredentialCodeFromHash(hash) {
  let value = hash;
  let chars = "";
  for (let i = 0; i < 8; i++) {
    const idx = Number(value & 31n);
    chars = CROCKFORD[idx] + chars;
    value >>= 5n;
  }
  return `${CREDENTIAL_CODE_PREFIX}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/**
 * @param {string} profileId
 * @param {string} qrId
 */
export function deriveCredentialCodeSync(profileId, qrId) {
  if (!profileId?.trim() || !qrId?.trim()) {
    throw new Error("profile_id and qr_id required for credential code");
  }
  const material = `hc-credential-code/v1\0${profileId.trim()}\0${qrId.trim()}`;
  return formatCredentialCodeFromHash(fnv1a64(material));
}

/**
 * @param {string} scanUrl
 * @returns {string | null}
 */
export function credentialCodeFromScanUrl(scanUrl) {
  const raw = scanUrl?.trim();
  if (!raw || !validateOfficialScanUrl(raw).ok) return null;
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (!match) return null;
    const profileId = decodeURIComponent(match[1]);
    const qrId = url.searchParams.get("q");
    if (!qrId) return null;
    return deriveCredentialCodeSync(profileId, qrId);
  } catch {
    return null;
  }
}

/**
 * @param {string} code
 * @param {string} profileId
 * @param {string} qrId
 */
export function credentialCodeMatches(code, profileId, qrId) {
  const normalized = code?.trim().toUpperCase();
  if (!CREDENTIAL_CODE_PATTERN.test(normalized)) return false;
  return deriveCredentialCodeSync(profileId, qrId) === normalized;
}

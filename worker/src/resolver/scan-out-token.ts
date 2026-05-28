/**
 * Signed short-lived tokens for GET /c/{profile_id}/out (SCANNER_EXPERIENCE Phase E).
 */

import {
  OFFICIAL_SCAN_PRODUCTION_HOST,
  validateOfficialScanUrl,
} from "../../../site/js/qr-scan-url-lock.mjs";
import { PROFILE_ID_REGEX } from "../crypto";
import { QR_ID_REGEX } from "./scan-state";

export const SCAN_OUT_TOKEN_TTL_SEC = 15 * 60;

/** Domains that skip the “unfamiliar domain” warning on the interstitial. */
export const SCAN_OUT_KNOWN_DOMAIN_SUFFIXES = [
  "wikipedia.org",
  "github.com",
  "mozilla.org",
];

export interface ScanOutTokenPayload {
  profile_id: string;
  qr_id: string;
  url: string;
  exp: number;
}

export type ExternalDestinationResult =
  | { ok: true; url: URL; domain: string; known: boolean }
  | { ok: false; code: string; message: string };

const DEV_SCAN_OUT_HMAC_SECRET = "local-dev-scan-out-hmac-not-for-production";

export function resolveScanOutHmacSecret(env?: { SCAN_OUT_HMAC_SECRET?: string }): string {
  return env?.SCAN_OUT_HMAC_SECRET?.trim() || DEV_SCAN_OUT_HMAC_SECRET;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * External destinations must leave the operator origin; scan URLs stay on /c/… .
 */
export function validateExternalDestinationUrl(
  urlString: string
): ExternalDestinationResult {
  const raw = urlString?.trim();
  if (!raw) {
    return { ok: false, code: "empty", message: "Destination URL is empty" };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, code: "parse", message: "Destination is not a valid URL" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      ok: false,
      code: "protocol",
      message: "Destination must use http or https",
    };
  }

  const host = url.hostname;
  if (!host) {
    return { ok: false, code: "host", message: "Destination has no host" };
  }

  if (host === OFFICIAL_SCAN_PRODUCTION_HOST || host.endsWith(".humanity.llc")) {
    return {
      ok: false,
      code: "operator_host",
      message: "Destination must be outside humanity.llc",
    };
  }

  const local =
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  if (url.protocol === "http:" && !local) {
    return {
      ok: false,
      code: "protocol",
      message: "Production external links must use https",
    };
  }

  if (validateOfficialScanUrl(raw).ok) {
    return {
      ok: false,
      code: "scan_url",
      message: "Scan URLs must open on /c/…, not via the out interstitial",
    };
  }

  if (url.username || url.password) {
    return { ok: false, code: "credentials", message: "Destination must not include credentials" };
  }

  const domain = host.toLowerCase();
  const known = SCAN_OUT_KNOWN_DOMAIN_SUFFIXES.some(
    (suffix) => domain === suffix || domain.endsWith(`.${suffix}`)
  );

  return { ok: true, url, domain, known };
}

export async function issueScanOutToken(
  secret: string,
  input: {
    profileId: string;
    qrId: string;
    url: string;
    ttlSec?: number;
    nowSec?: number;
  }
): Promise<string> {
  if (!PROFILE_ID_REGEX.test(input.profileId)) {
    throw new Error("Invalid profile_id for scan-out token");
  }
  if (!QR_ID_REGEX.test(input.qrId)) {
    throw new Error("Invalid qr_id for scan-out token");
  }
  const dest = validateExternalDestinationUrl(input.url);
  if (!dest.ok) {
    throw new Error(dest.message);
  }

  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const payload: ScanOutTokenPayload = {
    profile_id: input.profileId,
    qr_id: input.qrId,
    url: dest.url.toString(),
    exp: now + (input.ttlSec ?? SCAN_OUT_TOKEN_TTL_SEC),
  };

  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256Base64Url(secret, body);
  return `${body}.${sig}`;
}

export async function verifyScanOutToken(
  secret: string,
  token: string,
  opts: { profileId: string; nowSec?: number }
): Promise<
  | { ok: true; payload: ScanOutTokenPayload; domain: string; known: boolean }
  | { ok: false; code: string; message: string }
> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, code: "format", message: "Invalid out token format" };
  }

  const [body, sig] = parts;
  const expected = await hmacSha256Base64Url(secret, body);
  if (!timingSafeEqual(sig, expected)) {
    return { ok: false, code: "signature", message: "Out token signature invalid" };
  }

  let payload: ScanOutTokenPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body))
    ) as ScanOutTokenPayload;
  } catch {
    return { ok: false, code: "parse", message: "Out token payload invalid" };
  }

  if (payload.profile_id !== opts.profileId) {
    return { ok: false, code: "profile", message: "Out token does not match this card" };
  }
  if (!QR_ID_REGEX.test(payload.qr_id)) {
    return { ok: false, code: "qr_id", message: "Out token qr_id invalid" };
  }

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp < now) {
    return { ok: false, code: "expired", message: "This link has expired; scan the object again" };
  }

  const dest = validateExternalDestinationUrl(payload.url);
  if (!dest.ok) {
    return { ok: false, code: dest.code, message: dest.message };
  }

  return {
    ok: true,
    payload,
    domain: dest.domain,
    known: dest.known,
  };
}

/**
 * Interstitial URL for status JSON / integrators (external_actions).
 */
export async function buildScanOutInterstitialUrl(
  origin: string,
  secret: string,
  profileId: string,
  qrId: string,
  targetUrl: string
): Promise<string> {
  const token = await issueScanOutToken(secret, { profileId, qrId, url: targetUrl });
  const base = origin.replace(/\/$/, "");
  return `${base}/c/${encodeURIComponent(profileId)}/out?t=${encodeURIComponent(token)}`;
}

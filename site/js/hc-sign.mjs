/**
 * Browser signing helpers for Humanity Card create flow (mirrors worker/src/crypto).
 */
import * as ed from "https://esm.sh/@noble/ed25519@2.3.0";
import { base58 } from "https://esm.sh/@scure/base@1.2.6";
import canonicalize from "https://esm.sh/canonicalize@2.1.0";

const PROTOCOL_VERSION = "1.0";
const SIGNATURE_ALG = "Ed25519";
const CANONICALIZATION = "JCS";
const PAYLOAD_TYPE_REVOCATION = "revocation";

/** Level 0 bearer copy (V1_PRODUCT_TRUST_MODEL.md) — keep in sync with worker trust-copy.ts */
export const BEARER_WARNING =
  "This QR resolves to a Humanity Card. It does not prove the person holding this item is the card owner.";
const BASE58 =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(bytes) {
  return base58.encode(bytes);
}

export function decodeBase58(str) {
  return base58.decode(str);
}

export async function generateKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey,
    publicKey,
    publicKeyBase58: encodeBase58(publicKey),
  };
}

export function randomBase58(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE58[bytes[i] % BASE58.length];
  }
  return out;
}

export function generateProfileId() {
  return randomBase58(24);
}

export function generateQrId() {
  return `qr_${randomBase58(16)}`;
}

/** Revocation nonce (Technical Standards §10.1). */
export function generateRevocationNonce() {
  return `nonce_${randomBase58(16)}`;
}

export function encodePrivateKeyBase58(privateKey) {
  return encodeBase58(privateKey);
}

export function decodePrivateKeyBase58(privateKeyBase58) {
  return decodeBase58(privateKeyBase58);
}

export async function publicKeyFromPrivateKeyBase58(privateKeyBase58) {
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  return encodeBase58(await ed.getPublicKeyAsync(privateKey));
}

function requireFields(unsigned) {
  if (!unsigned.type || !unsigned.version) {
    throw new Error("Missing type or version on signed payload.");
  }
  if (!unsigned.profile_id && !unsigned.vouchee_profile_id) {
    throw new Error("Missing subject profile id.");
  }
}

export async function signDocument(unsigned, privateKey, publicKeyBase58) {
  requireFields(unsigned);
  const message = new TextEncoder().encode(canonicalize(unsigned));
  const sigBytes = await ed.signAsync(message, privateKey);
  const signedAt = new Date().toISOString();
  return {
    ...unsigned,
    signature: {
      alg: SIGNATURE_ALG,
      public_key: publicKeyBase58,
      signature: encodeBase58(sigBytes),
      signed_at: signedAt,
      canonicalization: CANONICALIZATION,
    },
  };
}

export function withProtocolFields(payload, type) {
  return { ...payload, type, version: PROTOCOL_VERSION };
}

/**
 * Resolver origin only (no path). Avoids ?api=https://humanity.llc/create
 * which would POST to /create/.well-known/... and Pages returns 405.
 */
export function resolverApiOrigin() {
  const params = new URLSearchParams(location.search);
  const apiParam = params.get("api");
  if (apiParam) {
    try {
      const parsed = new URL(apiParam, location.href);
      if (
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost"
      ) {
        return parsed.origin;
      }
    } catch {
      /* ignore bad api= on production */
    }
  }
  if (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) {
    return "http://127.0.0.1:8787";
  }
  return location.origin;
}

/** @deprecated use resolverApiOrigin — kept for existing imports */
export function resolverApiBase() {
  return resolverApiOrigin();
}

export function postCardsUrl() {
  return new URL("/.well-known/hc/v1/cards", resolverApiOrigin()).href;
}

export function postRevokeUrl(profileId) {
  return new URL(
    `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/revoke`,
    resolverApiOrigin()
  ).href;
}

export function getCardStatusUrl(profileId, qrId = null) {
  const url = new URL(
    `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/status`,
    resolverApiOrigin()
  );
  if (qrId) url.searchParams.set("q", qrId);
  return url.href;
}

export function getCardJsonUrl(profileId) {
  return new URL(
    `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}`,
    resolverApiOrigin()
  ).href;
}

export function qrScanUrl(profileId, qrId, origin = "https://humanity.llc") {
  return `${origin}/c/${profileId}?q=${qrId}`;
}

/** @param {string} issuedAt ISO timestamp @param {number} days valid from issue */
export function qrExpiryFromIssued(issuedAt, days) {
  const d = new Date(issuedAt);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function defaultQrExpiry(issuedAt) {
  return qrExpiryFromIssued(issuedAt, 365);
}

/**
 * Owner-signed revocation (POST /.well-known/hc/v1/cards/{profile_id}/revoke).
 * @param {{ profileId: string, targetKind: 'card'|'qr_credential', targetQrId?: string|null, privateKeyBase58: string, publicKeyBase58: string }} opts
 */
export async function signRevocation({
  profileId,
  targetKind,
  targetQrId = null,
  privateKeyBase58,
  publicKeyBase58,
}) {
  const privateKey = decodePrivateKeyBase58(privateKeyBase58);
  const revokedAt = new Date().toISOString();
  const payload = {
    profile_id: profileId,
    target_kind: targetKind,
    reason: "owner_revoked",
    revoked_at: revokedAt,
    nonce: generateRevocationNonce(),
  };
  if (targetKind === "qr_credential") {
    if (!targetQrId) throw new Error("target_qr_id required for QR revocation.");
    payload.target_qr_id = targetQrId;
  }
  const unsigned = withProtocolFields(payload, PAYLOAD_TYPE_REVOCATION);
  return signDocument(unsigned, privateKey, publicKeyBase58);
}

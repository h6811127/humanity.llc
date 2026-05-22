/**
 * Browser signing helpers for Humanity Card create flow (mirrors worker/src/crypto).
 */
import * as ed from "https://esm.sh/@noble/ed25519@2.3.0";
import { base58btc } from "https://esm.sh/@scure/base@1.2.6?bundle";
import canonicalize from "https://esm.sh/canonicalize@2.1.0";

const PROTOCOL_VERSION = "1.0";
const SIGNATURE_ALG = "Ed25519";
const CANONICALIZATION = "JCS";
const BASE58 =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(bytes) {
  return base58btc.encode(bytes);
}

export function decodeBase58(str) {
  return base58btc.decode(str);
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

export function resolverApiBase() {
  const params = new URLSearchParams(location.search);
  const api = params.get("api");
  if (api) return api.replace(/\/$/, "");
  if (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  ) {
    return "http://127.0.0.1:8787";
  }
  return location.origin;
}

export function qrScanUrl(profileId, qrId, origin = "https://humanity.llc") {
  return `${origin}/c/${profileId}?q=${qrId}`;
}

export function defaultQrExpiry(issuedAt) {
  const d = new Date(issuedAt);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

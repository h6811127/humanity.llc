/**
 * Shared helpers for public showcase seed scripts (status plate, live object, lost item).
 * Retries create with a unique handle suffix when HANDLE_TAKEN.
 */
import * as ed from "@noble/ed25519";
import { base58 } from "@scure/base";
import canonicalize from "canonicalize";

export const PROTOCOL_VERSION = "1.0";

export function encodeBase58(bytes) {
  return base58.encode(bytes);
}

export function randomBase58(len) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[b[i] % alphabet.length];
  return out;
}

/**
 * @param {string} base
 * @param {number} [attempt]
 */
export function showcaseHandle(base, attempt = 0) {
  if (attempt <= 0) return base;
  return `${base}_${randomBase58(6)}`;
}

export async function signDocument(unsigned, privateKey, publicKeyBase58) {
  const message = new TextEncoder().encode(canonicalize(unsigned));
  const sigBytes = await ed.signAsync(message, privateKey);
  return {
    ...unsigned,
    signature: {
      alg: "Ed25519",
      public_key: publicKeyBase58,
      signature: encodeBase58(sigBytes),
      signed_at: new Date().toISOString(),
      canonicalization: "JCS",
    },
  };
}

export function withProtocolFields(payload, type) {
  return { ...payload, type, version: PROTOCOL_VERSION };
}

export function isLocalApiOrigin(origin) {
  try {
    const url = new URL(origin.replace(/\/$/, ""));
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * @param {string} apiOrigin
 * @param {{ card: object; qr_credential: object }} payload
 */
export async function postShowcaseCreate(apiOrigin, payload) {
  const origin = apiOrigin.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (isLocalApiOrigin(origin)) {
    headers.Origin = origin;
  }
  const res = await fetch(`${origin}/.well-known/hc/v1/cards`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/**
 * @param {object} opts
 * @param {string} opts.apiOrigin
 * @param {string} opts.handleBase
 * @param {(handle: string) => Promise<{ card: object; qr_credential: object }>} opts.buildPayload
 * @param {number} [opts.maxAttempts]
 */
export async function createShowcaseWithHandleRetry({
  apiOrigin,
  handleBase,
  buildPayload,
  maxAttempts = 8,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const handle = showcaseHandle(handleBase, attempt);
    const payload = await buildPayload(handle);
    const result = await postShowcaseCreate(apiOrigin, payload);
    if (result.ok) {
      return { handle, body: result.body };
    }
    if (result.body?.error === "HANDLE_TAKEN" && attempt < maxAttempts - 1) {
      console.warn(`Handle @${handle} taken — retrying with a unique suffix (${attempt + 2}/${maxAttempts})…`);
      continue;
    }
    throw new Error(`Create failed: ${JSON.stringify(result.body)}`);
  }
  throw new Error(`Create failed after ${maxAttempts} handle attempts`);
}

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} qrId
 */
export function showcaseScanUrl(apiOrigin, profileId, qrId) {
  return `${apiOrigin.replace(/\/$/, "")}/c/${profileId}?q=${qrId}`;
}

export async function newShowcaseKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  const publicKeyBase58 = encodeBase58(publicKey);
  return { privateKey, publicKeyBase58 };
}

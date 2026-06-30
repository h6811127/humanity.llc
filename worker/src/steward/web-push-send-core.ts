/**
 * Web Push send primitives (RFC 8291 aes128gcm + RFC 8292 VAPID) using Web Crypto.
 * Workers-native — no Node `web-push` dependency.
 */

const encoder = new TextEncoder();

export function decodeBase64Url(input: string): Uint8Array {
  const padding = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function encodeBase64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pkcs8FromRawP256PrivateKey(rawPrivate: Uint8Array): Uint8Array {
  const prefix = Uint8Array.from([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce,
    0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  return concatBytes(prefix, rawPrivate);
}

export async function importVapidKeyPair(
  publicKeyBase64Url: string,
  privateKeyBase64Url: string,
  crypto: SubtleCrypto = globalThis.crypto.subtle
): Promise<CryptoKeyPair> {
  const publicKey = await crypto.importKey(
    "raw",
    decodeBase64Url(publicKeyBase64Url),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const privateKey = await crypto.importKey(
    "pkcs8",
    pkcs8FromRawP256PrivateKey(decodeBase64Url(privateKeyBase64Url)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  return { publicKey, privateKey };
}

async function hmacSha256(
  crypto: SubtleCrypto,
  key: Uint8Array,
  data: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.sign("HMAC", cryptoKey, data));
}

async function hkdfExpandFromPrk(
  crypto: SubtleCrypto,
  prk: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.importKey("raw", prk, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

async function hkdfWithSalt(
  crypto: SubtleCrypto,
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

export async function forgeVapidJwt(
  privateKey: CryptoKey,
  input: { sub: string; aud: string; exp: number },
  crypto: SubtleCrypto = globalThis.crypto.subtle
): Promise<string> {
  const header = encodeBase64Url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = encodeBase64Url(
    encoder.encode(JSON.stringify({ aud: input.aud, exp: input.exp, sub: input.sub }))
  );
  const unsigned = `${header}.${payload}`;
  const signature = await crypto.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsigned)
  );
  const sigBytes = new Uint8Array(signature);
  const rawLen = 64;
  let rawSig = sigBytes;
  if (sigBytes.length !== rawLen && sigBytes[0] === 0x30) {
    rawSig = derEcdsaSignatureToRaw(sigBytes);
  }
  return `${unsigned}.${encodeBase64Url(rawSig)}`;
}

function derEcdsaSignatureToRaw(der: Uint8Array): Uint8Array {
  let offset = 2;
  if (der[1]! & 0x80) offset = 2 + (der[1]! & 0x7f);
  offset += 1;
  const rLen = der[offset + 1]!;
  let r = der.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen + 1;
  const sLen = der[offset + 1]!;
  let s = der.slice(offset + 2, offset + 2 + sLen);
  const raw = new Uint8Array(64);
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

export interface WebPushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function buildAes128GcmPushBody(
  message: Uint8Array,
  subscription: WebPushSubscriptionKeys,
  crypto: SubtleCrypto = globalThis.crypto.subtle
): Promise<{ body: Uint8Array; localPublicKey: Uint8Array }> {
  const localKeys = await crypto.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKey = new Uint8Array(
    await crypto.exportKey("raw", localKeys.publicKey)
  );
  const uaPublicRaw = decodeBase64Url(subscription.keys.p256dh);
  const uaPublicKey = await crypto.importKey(
    "raw",
    uaPublicRaw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
  const sharedSecret = new Uint8Array(
    await crypto.deriveBits(
      { name: "ECDH", public: uaPublicKey },
      localKeys.privateKey,
      256
    )
  );
  const authSecret = decodeBase64Url(subscription.keys.auth);
  const keyInfo = concatBytes(
    encoder.encode("WebPush: info\0"),
    uaPublicRaw,
    localPublicKey,
    Uint8Array.from([1])
  );
  const prkKey = await hmacSha256(crypto, authSecret, sharedSecret);
  const ikm = await hkdfExpandFromPrk(crypto, prkKey, keyInfo, 32);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const cekInfo = concatBytes(
    encoder.encode("Content-Encoding: aes128gcm\0"),
    Uint8Array.from([1])
  );
  const nonceInfo = concatBytes(
    encoder.encode("Content-Encoding: nonce\0"),
    Uint8Array.from([1])
  );
  const cek = await hkdfWithSalt(crypto, ikm, salt, cekInfo, 16);
  const nonce = await hkdfWithSalt(crypto, ikm, salt, nonceInfo, 12);

  const aesKey = await crypto.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concatBytes(message, Uint8Array.from([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );

  const recordSize = 4096;
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, recordSize, false);
  const idLen = new Uint8Array([localPublicKey.length]);
  const body = concatBytes(salt, rs, idLen, localPublicKey, ciphertext);
  return { body, localPublicKey };
}

export async function sendWebPushTextMessage(
  subscription: WebPushSubscriptionKeys,
  message: string,
  input: {
    vapidPublicKeyBase64Url: string;
    vapidPrivateKey: CryptoKey;
    vapidPublicKeyRaw: Uint8Array;
    contactInformation: string;
    ttl?: number;
    urgency?: string;
    fetchImpl?: typeof fetch;
  }
): Promise<Response> {
  const crypto = globalThis.crypto.subtle;
  const fetchImpl = input.fetchImpl ?? fetch;
  const { body } = await buildAes128GcmPushBody(encoder.encode(message), subscription, crypto);
  const aud = new URL(subscription.endpoint).origin;
  const token = await forgeVapidJwt(input.vapidPrivateKey, {
    sub: input.contactInformation,
    aud,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return fetchImpl(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Urgency: input.urgency ?? "normal",
      TTL: String(input.ttl ?? 2419200),
      Authorization: `vapid t=${token}, k=${encodeBase64Url(input.vapidPublicKeyRaw)}`,
    },
    body,
  });
}

export function stewardWebPushContactFromEnv(env: {
  STEWARD_VAPID_CONTACT?: string;
}): string {
  const raw = env.STEWARD_VAPID_CONTACT?.trim();
  if (raw) return raw.startsWith("mailto:") ? raw : `mailto:${raw}`;
  return "mailto:push@humanity.llc";
}

export function stewardWebPushSendConfigured(env: {
  STEWARD_VAPID_PUBLIC_KEY?: string;
  STEWARD_VAPID_PRIVATE_KEY?: string;
}): boolean {
  return (
    typeof env.STEWARD_VAPID_PUBLIC_KEY === "string" &&
    env.STEWARD_VAPID_PUBLIC_KEY.trim().length > 0 &&
    typeof env.STEWARD_VAPID_PRIVATE_KEY === "string" &&
    env.STEWARD_VAPID_PRIVATE_KEY.trim().length > 0
  );
}

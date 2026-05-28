/**
 * AES-256-GCM encryption for fulfillment shipping PII at rest.
 * Key: FULFILLMENT_PII_ENCRYPTION_KEY (32 raw bytes, base64-encoded) — wrangler secret.
 */

export interface FulfillmentPiiEnv {
  FULFILLMENT_PII_ENCRYPTION_KEY?: string;
}

export interface EncryptedPayload {
  iv_b64: string;
  ciphertext_b64: string;
}

function decodeKeyMaterial(raw: string): Uint8Array | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const binary = atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)!;
    }
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

async function importKey(raw: string): Promise<CryptoKey | null> {
  const bytes = decodeKeyMaterial(raw);
  if (!bytes) return null;
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export function fulfillmentPiiEncryptionConfigured(env: FulfillmentPiiEnv): boolean {
  return decodeKeyMaterial(env.FULFILLMENT_PII_ENCRYPTION_KEY ?? "") !== null;
}

export async function encryptFulfillmentJson(
  env: FulfillmentPiiEnv,
  value: unknown
): Promise<EncryptedPayload | null> {
  const key = await importKey(env.FULFILLMENT_PII_ENCRYPTION_KEY ?? "");
  if (!key) return null;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  let binary = "";
  for (let i = 0; i < iv.length; i++) binary += String.fromCharCode(iv[i]!);
  const iv_b64 = btoa(binary);

  binary = "";
  const ct = new Uint8Array(ciphertext);
  for (let i = 0; i < ct.length; i++) binary += String.fromCharCode(ct[i]!);

  return { iv_b64, ciphertext_b64: btoa(binary) };
}

export async function decryptFulfillmentJson<T>(
  env: FulfillmentPiiEnv,
  payload: EncryptedPayload
): Promise<T | null> {
  const key = await importKey(env.FULFILLMENT_PII_ENCRYPTION_KEY ?? "");
  if (!key) return null;

  try {
    const ivBinary = atob(payload.iv_b64);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) iv[i] = ivBinary.charCodeAt(i)!;

    const ctBinary = atob(payload.ciphertext_b64);
    const ciphertext = new Uint8Array(ctBinary.length);
    for (let i = 0; i < ctBinary.length; i++) ciphertext[i] = ctBinary.charCodeAt(i)!;

    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}

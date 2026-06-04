/**
 * AES-GCM wrap for device_unlock owner keys (pure).
 * @see docs/CUSTODY_EASY_MODE.md
 */

/**
 * @param {CryptoKey} aesKey
 * @param {string} privateKeyB58
 */
export async function encryptOwnerPrivateKeyB58(aesKey, privateKeyB58) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(String(privateKeyB58));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plain);
  return { iv, ciphertext };
}

/**
 * @param {CryptoKey} aesKey
 * @param {Uint8Array} iv
 * @param {Uint8Array} ciphertext
 */
export async function decryptOwnerPrivateKeyB58(aesKey, iv, ciphertext) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  return new TextDecoder().decode(plain);
}

/**
 * @param {Uint8Array} rawKeyBytes
 */
export async function importAesGcmKey(rawKeyBytes) {
  return crypto.subtle.importKey("raw", rawKeyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

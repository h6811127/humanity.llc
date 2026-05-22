import { base58 } from "@scure/base";

import { BASE58_ALPHABET } from "./constants";
import { CRYPTO_ERROR, CryptoVerifyError } from "./errors";

/** Encode bytes to base58 (Bitcoin alphabet). */
export function encodeBase58(bytes: Uint8Array): string {
  return base58.encode(bytes);
}

/** Decode base58 string; throws CryptoVerifyError on invalid characters. */
export function decodeBase58(str: string): Uint8Array {
  if (!str || typeof str !== "string") {
    throw new CryptoVerifyError(CRYPTO_ERROR.INVALID_BASE58, "Empty base58 string");
  }
  for (const ch of str) {
    if (!BASE58_ALPHABET.includes(ch)) {
      throw new CryptoVerifyError(
        CRYPTO_ERROR.INVALID_BASE58,
        `Invalid base58 character: ${ch}`
      );
    }
  }
  try {
    return base58.decode(str);
  } catch {
    throw new CryptoVerifyError(CRYPTO_ERROR.INVALID_BASE58, "Base58 decode failed");
  }
}

export function decodePublicKeyBase58(publicKey: string): Uint8Array {
  const bytes = decodeBase58(publicKey);
  if (bytes.length !== 32) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.INVALID_PUBLIC_KEY,
      `Ed25519 public key must be 32 bytes, got ${bytes.length}`
    );
  }
  return bytes;
}

export function decodeSignatureBase58(signature: string): Uint8Array {
  const bytes = decodeBase58(signature);
  if (bytes.length !== 64) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.INVALID_SIGNATURE,
      `Ed25519 signature must be 64 bytes, got ${bytes.length}`
    );
  }
  return bytes;
}

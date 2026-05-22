import canonicalize from "canonicalize";

import { CANONICALIZATION } from "./constants";
import { CRYPTO_ERROR, CryptoVerifyError } from "./errors";

/**
 * RFC 8785 (JCS) canonical JSON string for signing.
 * @see docs/Technical Standards v1.0.md §5.4
 */
export function toCanonicalJson(value: unknown): string {
  const out = canonicalize(value);
  if (out === undefined) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.INVALID_CANONICALIZATION,
      "Value is not JSON-serializable for JCS"
    );
  }
  return out;
}

/** UTF-8 bytes of JCS canonical form (message signed by Ed25519). */
export function toCanonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(toCanonicalJson(value));
}

export function assertCanonicalizationMethod(
  method: string | undefined
): void {
  if (method !== undefined && method !== CANONICALIZATION) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.INVALID_CANONICALIZATION,
      `Expected canonicalization "${CANONICALIZATION}", got "${method}"`
    );
  }
}

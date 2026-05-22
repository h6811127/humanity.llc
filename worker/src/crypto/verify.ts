import {
  assertCanonicalizationMethod,
  toCanonicalBytes,
  toCanonicalJson,
} from "./canonical";
import { decodePublicKeyBase58, decodeSignatureBase58 } from "./base58";
import type { PayloadType } from "./constants";
import { CRYPTO_ERROR, CryptoVerifyError } from "./errors";
import { verifyCanonicalBytes } from "./ed25519";
import {
  isSignatureBlock,
  stripSignature,
  type SignatureBlock,
} from "./envelope";
import { extractNonce } from "./nonce";
import { validateRequiredSignedFields } from "./signed-payload";

export interface VerifyOptions {
  /** Reject if document `type` does not match (signature confusion defense). */
  expectedType?: PayloadType;
  /**
   * If set, signature public key must match (e.g. card.public_key).
   * If omitted, uses signature.public_key from the document.
   */
  expectedPublicKeyBase58?: string;
  /** When set, require and consume nonce via guard (revocation/vouch replay tests). */
  nonceGuard?: { assertFresh(nonce: string): void };
}

export type VerifySuccess = {
  ok: true;
  type: PayloadType;
  unsigned: Record<string, unknown>;
  canonical: string;
  signature: SignatureBlock;
};

export type VerifyFailure = {
  ok: false;
  code: string;
  message: string;
};

export type VerifyResult = VerifySuccess | VerifyFailure;

function fail(code: string, message: string): VerifyFailure {
  return { ok: false, code, message };
}

/**
 * Verify inline-signed Humanity document:
 * 1. Validate signature block shape and JCS
 * 2. Validate §17 required fields on unsigned body
 * 3. Ed25519 verify over JCS(unsigned without signature)
 */
export async function verifySignedDocument(
  document: Record<string, unknown>,
  options: VerifyOptions = {}
): Promise<VerifyResult> {
  try {
    const sigRaw = document.signature;
    if (!isSignatureBlock(sigRaw)) {
      return fail(
        CRYPTO_ERROR.MALFORMED_SIGNATURE_BLOCK,
        "Missing or invalid signature block"
      );
    }

    assertCanonicalizationMethod(sigRaw.canonicalization);

    const unsigned = stripSignature(document) as Record<string, unknown>;
    const payloadType = validateRequiredSignedFields(unsigned);

    if (options.expectedType && payloadType !== options.expectedType) {
      return fail(
        CRYPTO_ERROR.PAYLOAD_TYPE_MISMATCH,
        `Expected type ${options.expectedType}, got ${payloadType}`
      );
    }

    const expectedPk = options.expectedPublicKeyBase58 ?? sigRaw.public_key;
    if (sigRaw.public_key !== expectedPk) {
      return fail(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Signature public_key does not match expected owner key"
      );
    }

    if (
      payloadType === "humanity_card" &&
      typeof unsigned.public_key === "string" &&
      unsigned.public_key !== sigRaw.public_key
    ) {
      return fail(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Card public_key must match signature.public_key"
      );
    }

    const nonce = extractNonce(unsigned);
    if (nonce && options.nonceGuard) {
      try {
        options.nonceGuard.assertFresh(nonce);
      } catch (e) {
        if (e instanceof CryptoVerifyError) {
          return fail(e.code, e.message);
        }
        throw e;
      }
    }

    const message = toCanonicalBytes(unsigned);
    const sigBytes = decodeSignatureBase58(sigRaw.signature);
    const pkBytes = decodePublicKeyBase58(expectedPk);
    const valid = await verifyCanonicalBytes(message, sigBytes, pkBytes);

    if (!valid) {
      return fail(
        CRYPTO_ERROR.INVALID_SIGNATURE,
        "Ed25519 signature verification failed"
      );
    }

    return {
      ok: true,
      type: payloadType,
      unsigned,
      canonical: toCanonicalJson(unsigned),
      signature: sigRaw,
    };
  } catch (e) {
    if (e instanceof CryptoVerifyError) {
      return fail(e.code, e.message);
    }
    return fail(CRYPTO_ERROR.INVALID_SIGNATURE, String(e));
  }
}

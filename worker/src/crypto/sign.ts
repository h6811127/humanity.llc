import { CANONICALIZATION, PROTOCOL_VERSION, SIGNATURE_ALG } from "./constants";
import { toCanonicalBytes } from "./canonical";
import { encodeBase58 } from "./base58";
import { signCanonicalBytes } from "./ed25519";
import type { SignatureBlock } from "./envelope";
import { stripSignature } from "./envelope";
import { validateRequiredSignedFields } from "./signed-payload";

export interface SignOptions {
  privateKey: Uint8Array;
  publicKeyBase58: string;
  signedAt?: string;
}

/**
 * Sign an unsigned payload (no `signature` key). Adds required fields validation,
 * JCS canonicalization, and inline SignatureBlock per Technical Standards §5.3.
 */
export async function signDocument<T extends Record<string, unknown>>(
  unsigned: T,
  options: SignOptions
): Promise<T & { signature: SignatureBlock }> {
  validateRequiredSignedFields(unsigned as Record<string, unknown>);

  const message = toCanonicalBytes(unsigned);
  const sigBytes = await signCanonicalBytes(message, options.privateKey);
  const signedAt = options.signedAt ?? new Date().toISOString();

  const signature: SignatureBlock = {
    alg: SIGNATURE_ALG,
    public_key: options.publicKeyBase58,
    signature: encodeBase58(sigBytes),
    signed_at: signedAt,
    canonicalization: CANONICALIZATION,
  };

  return { ...unsigned, signature };
}

/** Re-sign an existing document (strips old signature first). */
export async function resignDocument<T extends Record<string, unknown>>(
  doc: T & { signature?: SignatureBlock },
  options: SignOptions
): Promise<T & { signature: SignatureBlock }> {
  const unsigned = stripSignature(doc as Record<string, unknown> & { signature: SignatureBlock });
  return signDocument(unsigned as T, options);
}

/** Attach protocol version and type before signing (client helper). */
export function withProtocolFields<T extends Record<string, unknown>>(
  payload: T,
  type: string,
  version: string = PROTOCOL_VERSION
): T & { type: string; version: string } {
  return { ...payload, type, version };
}

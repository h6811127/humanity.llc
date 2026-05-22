import { CANONICALIZATION, SIGNATURE_ALG } from "./constants";

/** Inline signature block on Humanity documents (Technical Standards §5.3). */
export interface SignatureBlock {
  alg: typeof SIGNATURE_ALG;
  public_key: string;
  signature: string;
  signed_at: string;
  canonicalization?: typeof CANONICALIZATION;
}

export function isSignatureBlock(value: unknown): value is SignatureBlock {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    s.alg === SIGNATURE_ALG &&
    typeof s.public_key === "string" &&
    typeof s.signature === "string" &&
    typeof s.signed_at === "string"
  );
}

/** Remove top-level `signature` before canonicalization. */
export function stripSignature<T extends Record<string, unknown>>(
  doc: T
): Omit<T, "signature"> {
  const { signature: _sig, ...unsigned } = doc;
  return unsigned;
}

/** Verification / validation error codes (align with V1_IMPLEMENTATION_CONTRACTS error names). */
export const CRYPTO_ERROR = {
  INVALID_SIGNATURE: "CARD_INVALID_SIGNATURE",
  INVALID_CANONICALIZATION: "INVALID_CANONICALIZATION",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  PAYLOAD_TYPE_MISMATCH: "PAYLOAD_TYPE_MISMATCH",
  UNKNOWN_PAYLOAD_TYPE: "UNKNOWN_PAYLOAD_TYPE",
  INVALID_BASE58: "INVALID_BASE58",
  INVALID_PUBLIC_KEY: "INVALID_PUBLIC_KEY",
  INVALID_PROFILE_ID: "INVALID_PROFILE_ID",
  REPLAYED_NONCE: "REPLAYED_NONCE",
  MALFORMED_SIGNATURE_BLOCK: "MALFORMED_SIGNATURE_BLOCK",
} as const;

export type CryptoErrorCode = (typeof CRYPTO_ERROR)[keyof typeof CRYPTO_ERROR];

export class CryptoVerifyError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string) {
    super(message);
    this.name = "CryptoVerifyError";
    this.code = code;
  }
}

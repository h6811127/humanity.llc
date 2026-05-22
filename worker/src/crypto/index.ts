export {
  BASE58_ALPHABET,
  CANONICALIZATION,
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  PROTOCOL_VERSION,
  SIGNATURE_ALG,
  type PayloadType,
} from "./constants";
export { CRYPTO_ERROR, CryptoVerifyError } from "./errors";
export { decodeBase58, decodePublicKeyBase58, encodeBase58 } from "./base58";
export {
  assertCanonicalizationMethod,
  toCanonicalBytes,
  toCanonicalJson,
} from "./canonical";
export {
  getTestKeypair,
  getTestPrivateKeySeed,
  signCanonicalBytes,
  verifyBase58Signature,
  verifyCanonicalBytes,
} from "./ed25519";
export {
  isSignatureBlock,
  stripSignature,
  type SignatureBlock,
} from "./envelope";
export { NonceReplayGuard, extractNonce } from "./nonce";
export {
  PAYLOAD_FIELD_RULES,
  assertValidProfileId,
  validateRequiredSignedFields,
} from "./signed-payload";
export { resignDocument, signDocument, withProtocolFields } from "./sign";
export {
  verifySignedDocument,
  type VerifyFailure,
  type VerifyOptions,
  type VerifyResult,
  type VerifySuccess,
} from "./verify";

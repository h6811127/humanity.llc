/** Protocol version for all hc/v1 signed payloads. */
export const PROTOCOL_VERSION = "1.0" as const;

export const SIGNATURE_ALG = "Ed25519" as const;
export const CANONICALIZATION = "JCS" as const;

/**
 * Signed payload `type` values (Technical Standards §17  -  prevents signature confusion).
 * @see docs/Technical Standards v1.0.md
 */
export const PAYLOAD_TYPES = {
  HUMANITY_CARD: "humanity_card",
  QR_CREDENTIAL: "qr_credential",
  VOUCH: "vouch",
  VOUCH_REVOCATION: "vouch_revocation",
  REVOCATION: "revocation",
  BADGE: "badge",
  SUSPENSION: "suspension",
  EXPORT_MANIFEST: "export_manifest",
  LIVE_CONTROL_RESPONSE: "live_control_response",
  STEWARD_ACCOUNT_LINK: "steward_account_link_v1",
  CHILD_OBJECT: "child_object",
  RELAY_OFFER_OWNER_QUERY: "relay_offer_owner_query",
} as const;

export type PayloadType = (typeof PAYLOAD_TYPES)[keyof typeof PAYLOAD_TYPES];

/** Base58 alphabet (Bitcoin); excludes 0 O I l per Technical Standards §4.2. */
export const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** New profile IDs MUST be 24 base58 characters (accept 20–32 for verify). */
export const PROFILE_ID_LENGTH_NEW = 24;
export const PROFILE_ID_LENGTH_MIN = 20;
export const PROFILE_ID_LENGTH_MAX = 32;

export const PROFILE_ID_REGEX = new RegExp(
  `^[${BASE58_ALPHABET}]{${PROFILE_ID_LENGTH_MIN},${PROFILE_ID_LENGTH_MAX}}$`
);

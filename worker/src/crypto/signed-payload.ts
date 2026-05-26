import {
  PAYLOAD_TYPES,
  PROFILE_ID_REGEX,
  PROTOCOL_VERSION,
  type PayloadType,
} from "./constants";
import { CRYPTO_ERROR, CryptoVerifyError } from "./errors";

const ISO8601_Z =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Per-type rules for Technical Standards §17 required fields. */
export interface PayloadFieldRules {
  subjectProfileField: string;
  timestampFields: readonly string[];
  uniqueIdFields: readonly string[];
}

export const PAYLOAD_FIELD_RULES: Record<PayloadType, PayloadFieldRules> = {
  [PAYLOAD_TYPES.HUMANITY_CARD]: {
    subjectProfileField: "profile_id",
    timestampFields: ["created_at", "updated_at"],
    uniqueIdFields: ["profile_id"],
  },
  [PAYLOAD_TYPES.QR_CREDENTIAL]: {
    subjectProfileField: "profile_id",
    timestampFields: ["issued_at"],
    uniqueIdFields: ["qr_id", "nonce"],
  },
  [PAYLOAD_TYPES.VOUCH]: {
    subjectProfileField: "vouchee_profile_id",
    timestampFields: ["created_at"],
    uniqueIdFields: ["vouch_id", "nonce"],
  },
  [PAYLOAD_TYPES.VOUCH_REVOCATION]: {
    subjectProfileField: "vouchee_profile_id",
    timestampFields: ["revoked_at"],
    uniqueIdFields: ["vouch_id", "nonce"],
  },
  [PAYLOAD_TYPES.REVOCATION]: {
    subjectProfileField: "profile_id",
    timestampFields: ["revoked_at"],
    uniqueIdFields: ["nonce"],
  },
  [PAYLOAD_TYPES.BADGE]: {
    subjectProfileField: "issued_to",
    timestampFields: ["issued_at"],
    uniqueIdFields: ["badge_id", "nonce"],
  },
  [PAYLOAD_TYPES.SUSPENSION]: {
    subjectProfileField: "profile_id",
    timestampFields: ["suspended_at"],
    uniqueIdFields: ["nonce"],
  },
  [PAYLOAD_TYPES.EXPORT_MANIFEST]: {
    subjectProfileField: "profile_id",
    timestampFields: ["exported_at"],
    uniqueIdFields: ["manifest_id", "nonce"],
  },
  [PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE]: {
    subjectProfileField: "profile_id",
    timestampFields: ["signed_at"],
    uniqueIdFields: ["challenge_id", "nonce"],
  },
  [PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK]: {
    subjectProfileField: "profile_id",
    timestampFields: ["issued_at", "expires_at"],
    uniqueIdFields: ["nonce"],
  },
};

export function isPayloadType(value: string): value is PayloadType {
  return Object.values(PAYLOAD_TYPES).includes(value as PayloadType);
}

function requireString(
  obj: Record<string, unknown>,
  field: string
): string {
  const v = obj[field];
  if (typeof v !== "string" || v.length === 0) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      `Missing or empty required field: ${field}`
    );
  }
  return v;
}

function assertIsoTimestamp(value: string, field: string): void {
  if (!ISO8601_Z.test(value)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      `Invalid ISO-8601 timestamp on ${field}: ${value}`
    );
  }
}

export function assertValidProfileId(profileId: string, field: string): void {
  if (!PROFILE_ID_REGEX.test(profileId)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.INVALID_PROFILE_ID,
      `Invalid profile_id on ${field}: ${profileId}`
    );
  }
}

/**
 * Validates Technical Standards §17 required fields on the unsigned payload.
 */
export function validateRequiredSignedFields(
  unsigned: Record<string, unknown>
): PayloadType {
  const typeRaw = requireString(unsigned, "type");
  if (!isPayloadType(typeRaw)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.UNKNOWN_PAYLOAD_TYPE,
      `Unknown payload type: ${typeRaw}`
    );
  }

  const version = requireString(unsigned, "version");
  if (version !== PROTOCOL_VERSION) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      `Expected version "${PROTOCOL_VERSION}", got "${version}"`
    );
  }

  const rules = PAYLOAD_FIELD_RULES[typeRaw];
  const subject = requireString(unsigned, rules.subjectProfileField);
  assertValidProfileId(subject, rules.subjectProfileField);

  const hasTimestamp = rules.timestampFields.some((f) => {
    const v = unsigned[f];
    if (typeof v === "string" && v.length > 0) {
      assertIsoTimestamp(v, f);
      return true;
    }
    return false;
  });
  if (!hasTimestamp) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      `Missing timestamp; expected one of: ${rules.timestampFields.join(", ")}`
    );
  }

  const hasUniqueId = rules.uniqueIdFields.some((f) => {
    const v = unsigned[f];
    return typeof v === "string" && v.length > 0;
  });
  if (!hasUniqueId) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      `Missing nonce or unique ID; expected one of: ${rules.uniqueIdFields.join(", ")}`
    );
  }

  return typeRaw;
}

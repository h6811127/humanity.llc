/**
 * Pure helpers for steward account link + session POST (hosted tier E2).
 * @see docs/HOSTED_TIER_TECHNICAL_STANDARDS_DELTA.md § steward_account_link_v1
 */

export const STEWARD_ACCOUNT_LINK_TYPE = "steward_account_link_v1";
export const STEWARD_OPERATOR_ID = "humanity.llc";

/** Checkout / billing return query param (strip after consume). */
export const STEWARD_ACCOUNT_URL_PARAM = "hc_account_id";

/** sessionStorage — survives reload until link succeeds or session exists. */
export const STEWARD_PENDING_ACCOUNT_STORAGE_KEY = "hc_steward_pending_account_id";

/** Max link_proof TTL (operator rejects longer). */
export const STEWARD_LINK_TTL_MS = 5 * 60 * 1000;

export const ACCOUNT_ID_REGEX =
  /^acc_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,64}$/;

/**
 * @param {string | null | undefined} accountId
 * @returns {boolean}
 */
export function isValidStewardAccountId(accountId) {
  return typeof accountId === "string" && ACCOUNT_ID_REGEX.test(accountId.trim());
}

/**
 * @param {URLSearchParams | string} input
 * @returns {string | null}
 */
export function parseStewardAccountIdFromUrl(input) {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input : `?${input}`)
      : input;
  const raw = params.get(STEWARD_ACCOUNT_URL_PARAM);
  if (!raw) return null;
  const trimmed = raw.trim();
  return isValidStewardAccountId(trimmed) ? trimmed : null;
}

/**
 * @param {number} [now]
 * @returns {{ issued_at: string, expires_at: string }}
 */
export function stewardAccountLinkTimestamps(now = Date.now()) {
  const issued = new Date(now);
  const expires = new Date(now + STEWARD_LINK_TTL_MS);
  return {
    issued_at: issued.toISOString(),
    expires_at: expires.toISOString(),
  };
}

/**
 * Unsigned steward link fields (before signDocument + withProtocolFields).
 *
 * @param {{
 *   profile_id: string,
 *   account_id: string,
 *   device_id: string,
 *   nonce: string,
 *   issued_at: string,
 *   expires_at: string,
 *   operator_id?: string,
 * }} fields
 */
export function buildStewardAccountLinkUnsigned(fields) {
  return {
    profile_id: fields.profile_id,
    account_id: fields.account_id,
    operator_id: fields.operator_id ?? STEWARD_OPERATOR_ID,
    device_id: fields.device_id,
    issued_at: fields.issued_at,
    expires_at: fields.expires_at,
    nonce: fields.nonce,
  };
}

/**
 * Prefer checkout return param; fall back to pending storage.
 *
 * @param {string | null | undefined} urlAccountId
 * @param {string | null | undefined} pendingAccountId
 * @returns {string | null}
 */
export function resolveStewardAccountLinkTarget(urlAccountId, pendingAccountId) {
  if (isValidStewardAccountId(urlAccountId)) return String(urlAccountId).trim();
  if (isValidStewardAccountId(pendingAccountId)) return String(pendingAccountId).trim();
  return null;
}

/**
 * Hub monitoring line while billing checkout return is pending link.
 *
 * @param {boolean} hasSigningKeys
 * @returns {string | null}
 */
export function stewardBillingReturnPendingLine(hasSigningKeys) {
  if (hasSigningKeys) {
    return "Finishing hosted plan link on this device…";
  }
  return "Hosted plan ready — open or import a saved card to link this device after checkout.";
}

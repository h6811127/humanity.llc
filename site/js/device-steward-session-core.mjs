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

/** Matches worker `DEVICE_ID_REGEX` (no 0/O/l to avoid ambiguity). */
export const STEWARD_DEVICE_ID_REGEX =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz_-]{8,64}$/;

const DEVICE_ID_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * @param {string | null | undefined} accountId
 * @returns {boolean}
 */
export function isValidStewardAccountId(accountId) {
  return typeof accountId === "string" && ACCOUNT_ID_REGEX.test(accountId.trim());
}

/**
 * @param {string | null | undefined} deviceId
 */
export function isValidStewardDeviceId(deviceId) {
  return (
    typeof deviceId === "string" && STEWARD_DEVICE_ID_REGEX.test(deviceId.trim())
  );
}

/**
 * Opaque install id for steward metering (must not use crypto.randomUUID — contains `0`).
 *
 * @returns {string}
 */
export function generateStewardDeviceId() {
  let suffix = "";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    suffix += DEVICE_ID_ALPHABET[b % DEVICE_ID_ALPHABET.length];
  }
  return `dev_${suffix}`;
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

const ACCOUNT_ID_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * New steward billing account id for first link (before or without Stripe checkout).
 * Operator creates the row on successful POST /steward/session.
 *
 * @returns {string}
 */
export function generateStewardAccountId() {
  let suffix = "";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    suffix += ACCOUNT_ID_ALPHABET[b % ACCOUNT_ID_ALPHABET.length];
  }
  return `acc_${suffix}`;
}

/**
 * @param {string | null | undefined} urlAccountId
 * @param {string | null | undefined} pendingAccountId
 * @returns {string}
 */
export function stewardAccountIdForLink(urlAccountId, pendingAccountId) {
  return (
    resolveStewardAccountLinkTarget(urlAccountId, pendingAccountId) ??
    generateStewardAccountId()
  );
}

/**
 * Map resolver errors to actionable copy on /created/ and hub.
 *
 * @param {number} [status]
 * @param {string} [code]
 * @param {string} [message]
 */
export function formatStewardLinkUserMessage(status, code, message) {
  const msg = typeof message === "string" ? message.trim() : "";
  const c = typeof code === "string" ? code.trim() : "";

  if (c === "PROFILE_ALREADY_LINKED" || msg.includes("already linked")) {
    return msg || "This card is already linked to another steward account.";
  }
  if (msg.includes("Card not found") || (status === 404 && c === "NOT_FOUND")) {
    return "This card is not on the production network yet. Finish setup on Live (publish or sync), or import keys for a card that already exists on humanity.llc.";
  }
  if (
    c === "INVALID_SIGNATURE" ||
    c === "SIGNATURE_INVALID" ||
    /signature|verification failed/i.test(msg)
  ) {
    return "Keys in this tab do not match the card on the network. On Live, open the correct saved card (Take control), then try Connect again.";
  }
  if (c === "CARD_NOT_ACTIVE" || msg.includes("not active")) {
    return "This card is revoked or inactive on the network. Restore or create an active card before linking a steward account.";
  }
  if (c === "LINK_EXPIRED" || msg.includes("expired")) {
    return "Link proof expired. Click Connect steward account again.";
  }
  if (c === "REPLAYED_NONCE" || msg.includes("nonce already used")) {
    return "That link was already used. Click Connect steward account again.";
  }
  if (c === "INVALID_DEVICE_ID" || msg.includes("Invalid device_id")) {
    return "This browser stored an invalid device id (often from an older build). Refresh the page and click Connect steward account again.";
  }
  if (status === 404 && msg.includes("Hosted steward")) {
    return "Hosted steward is not enabled on this operator.";
  }
  if (msg.includes("Could not reach")) {
    return msg;
  }
  return msg || (status ? `Steward link failed (${status}).` : "Steward link failed.");
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

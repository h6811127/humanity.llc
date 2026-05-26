/**
 * /created/ route gate — pure checks before showing live success chrome.
 * @see docs/PRODUCTION_SAD_PATH_QA_2026-05-26.md P0-1
 */

/** @typedef {"redirect_wallet" | "ok" | "invalid_link" | "incomplete_link" | "session_mismatch"} CreatedRouteAction */

/**
 * @param {number} status HTTP status from GET /cards/{profile_id}
 * @returns {"ok" | "not_found" | "bad_request" | "unreachable"}
 */
export function classifyCardLookupStatus(status) {
  if (status >= 200 && status < 300) return "ok";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "bad_request";
  return "unreachable";
}

/**
 * @param {{
 *   profileIdParam?: string | null,
 *   qrIdParam?: string | null,
 *   session?: { profile_id?: string, qr_id?: string } | null,
 * }} input
 */
export function shouldRedirectCreatedToWallet(input) {
  const { profileIdParam, qrIdParam, session } = input;
  const hasParam = !!(profileIdParam || qrIdParam);
  const hasSession = !!(session?.profile_id || session?.qr_id);
  return !hasParam && !hasSession;
}

/**
 * @param {{
 *   profileIdParam?: string | null,
 *   sessionProfileId?: string | null,
 * }} input
 */
export function isCreatedSessionProfileMismatch(input) {
  const { profileIdParam, sessionProfileId } = input;
  if (!profileIdParam || !sessionProfileId) return false;
  return profileIdParam !== sessionProfileId;
}

/**
 * @param {{
 *   qrIdParam?: string | null,
 *   sessionQrId?: string | null,
 *   cardActiveQrId?: string | null,
 * }} input
 */
export function resolveCreatedQrId(input) {
  const { qrIdParam, sessionQrId, cardActiveQrId } = input;
  return qrIdParam?.trim() || sessionQrId?.trim() || cardActiveQrId?.trim() || null;
}

/**
 * @param {string | null | undefined} profileId
 */
export function createdRouteNeedsProfileLookup(profileId) {
  return !!profileId?.trim();
}

/**
 * @param {"not_found" | "bad_request" | "unreachable"} reason
 */
export function createdInvalidLinkMessage(reason) {
  if (reason === "not_found") {
    return "This card was not found on the network. Check the link from your create confirmation or create a new card.";
  }
  if (reason === "bad_request") {
    return "This link has an invalid profile or QR id. Open the full URL from your create confirmation.";
  }
  return "Could not reach the network to verify this card. Try again when you are online.";
}

export const CREATED_INCOMPLETE_LINK_MESSAGE =
  "Missing profile or QR in this link. Create a new card, or open the full URL from your create confirmation.";

export const CREATED_SESSION_MISMATCH_HTML =
  'This link is for a different card than the keys in this tab. Open <a href="/wallet/">My cards</a> and tap <strong>Open controls</strong> on the card you want.';

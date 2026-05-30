/**
 * /created/ route gate — pure checks before showing live success chrome.
 * @see docs/PRODUCTION_SAD_PATH_QA_2026-05-26.md P0-1, P2-9
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
 * @param {string} [search] location.search (with or without leading ?)
 */
export function parseCreatedUrlSearch(search = "") {
  const normalized = search.startsWith("?") ? search : search ? `?${search}` : "";
  const params = new URLSearchParams(normalized);
  return {
    profileIdParam: params.get("profile_id"),
    qrIdParam: params.get("qr_id"),
  };
}

/**
 * @param {string | null | undefined} raw sessionStorage hc_created JSON
 * @returns {Record<string, unknown> | null}
 */
export function parseHcCreatedSession(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Inline bootstrap on /created/ (must stay aligned with early body script).
 * @param {{ locationSearch?: string, session?: Record<string, unknown> | null }} input
 * @returns {{ action: "redirect_wallet" } | { action: "pending_shell" }}
 */
export function evaluateCreatedEarlyBootstrap(input) {
  const { profileIdParam, qrIdParam } = parseCreatedUrlSearch(input.locationSearch ?? "");
  const session = input.session ?? null;
  if (shouldRedirectCreatedToWallet({ profileIdParam, qrIdParam, session })) {
    return { action: "redirect_wallet" };
  }
  return { action: "pending_shell" };
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
  'This link is for a different card than the control loaded in this tab. Open <a href="/wallet/">My objects</a> and tap <strong>Open controls</strong> on the card you want.';

/**
 * Whether `#created-setup-root` / `#created-control-root` stay hidden during route shell apply.
 * Workspace mode (`applyCreatedWorkspaceMode`) is the only code path that reveals one root.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-2
 * @param {{ pending?: boolean, action: CreatedRouteAction }} gate
 */
export function createdRouteShellHidesWorkspaceRoots(gate) {
  void gate;
  return true;
}

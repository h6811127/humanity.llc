/**
 * Post-revoke banner copy on /created/ Manage (Safari empty-bar fix).
 * @see docs/CREATED_UI_SAFARI_HELP_REVOKE_INVESTIGATION.md
 */

/**
 * @param {string | undefined} kind `card` | `qr_credential` from session or resolver
 * @returns {string}
 */
export function ownerRevokedBannerMessage(kind) {
  if (kind === "card") {
    return "Card disabled. Scans may take up to a minute to update.";
  }
  if (kind === "qr_credential") {
    return "This QR is revoked. You can still disable the whole card below.";
  }
  return "";
}

/**
 * @param {string | undefined} kind
 */
export function ownerRevokedBannerShouldShow(kind) {
  return ownerRevokedBannerMessage(kind).length > 0;
}

/**
 * @param {HTMLElement | null} el `#owner-revoked-banner`
 * @param {string | undefined} kind pass undefined to hide
 */
export function applyOwnerRevokedBanner(el, kind) {
  if (!el) return;
  const message = ownerRevokedBannerMessage(kind);
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

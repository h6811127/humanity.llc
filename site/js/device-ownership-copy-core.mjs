/**
 * Layer 2 ownership copy shared across device shell modules.
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md § Terminology map · D7 · D9g
 */

export const OWNERSHIP_NOT_LOADED_TAB = "Ownership not loaded in this tab.";

export const TAKE_CONTROL_HERE = "Take control here";

export const TAKE_CONTROL_HERE_ATTEST =
  "Take control here to attest, or create a card.";

export const LOAD_CONTROL_IN_TAB_FIRST = "Take control in this tab first.";

export const IMPORT_OWNERSHIP_LOADED_TAB =
  "Imported ownership into this tab. Open controls to revoke, update status plates, or manage object QRs.";

export const UNLOCK_CONTROL_FIRST = "Unlock control above first.";

export const BACKUP_INVALID_OWNERSHIP =
  "This backup file does not contain valid ownership data. Re-download from /created/ after create.";

/** Wrong passphrase on `.hcbackup` decrypt (K2 · M5.5). */
export const BACKUP_WRONG_PASSPHRASE =
  "Wrong passphrase. Type it by hand or re-pick the saved entry in your password manager (iPhone Passwords / Android).";

/** `/created/` view mode when signing keys are not in this tab (K1 · K5). */
export const VIEW_ONLY_CARD_TITLE = "View this card";

export const VIEW_ONLY_NO_SESSION_DETAIL =
  "Finish create in the tab where you clicked Create, then tap Save ownership on this device there. Later: recovery method or encrypted backup under Manage on this card page.";

export const DEFAULT_FOR_ATTESTATION = "Default for attestation";

export const DEFAULT_FOR_ATTESTATION_ON_SCAN = "Default for attestation on scan";

export const SET_DEFAULT_FOR_ATTESTATION = "Set as default for attestation";

export const EXPORT_FOR_DEVELOPERS = "Export for developers";

export const DEVELOPER_EXPORT_SUBTITLE =
  "Public key · encrypted backup · raw recovery import";

export const DEFAULT_ATTESTATION_ELIGIBILITY_ALERT =
  "Only Steward or Vouched Human cards can be set as default for attestation.";

/** Scan SSR vouch explainer (vouch-issue.mjs replaces at runtime). */
export const VOUCH_EXPLAINER_EYEBROW = "Your control";

export const VOUCH_EXPLAINER_TITLE = "Checking this tab";

export const VOUCH_EXPLAINER_INITIAL_COPY =
  "Checking whether you have control of your identity in this tab. Steward and Vouched Human are network checks—separate from attestation. " +
  "Use <strong>Attest as…</strong> or <a href=\"WALLET_HREF\">My objects</a>. " +
  "Only the signed attestation is sent; your control stays on this device.";

/** Live control scanner lead (M7 comprehension). */
export const LIVE_CONTROL_SCANNER_LEAD =
  "Ask the owner to prove they can respond with control of this object—right now, on the spot.";

/** Live control success panel (M7 L1–L2 · H-002). */
export const LIVE_CONTROL_SUCCESS_TITLE = "Control proven";

export const LIVE_CONTROL_SUCCESS_COPY =
  "Control proven moments ago. This does not prove legal identity, vouching, or ownership of the physical object.";

export const LIVE_CONTROL_ASK_LABEL = "Ask for live proof";

/** Challenge window ended without owner sign (M7 pre-flight step 6). */
export const LIVE_CONTROL_REQUEST_EXPIRED_STATUS =
  "The 2-minute window ended. You can ask again.";

/** Proof display window ended after success (M7 pre-flight step 5). */
export const LIVE_CONTROL_PROOF_EXPIRED_STATUS =
  "Live proof expired. Ask again to prove control now.";

/** Scan limits disclosure title (M5 stranger path · V1 launch gates). */
export const SCAN_LIMITS_DISCLOSURE_TITLE = "What this scan does not prove";

/** Founding Tier 0 shop comprehension (FOUNDING_DROP_BRIEF · LAUNCH_LANGUAGE_KIT). */
export const FOUNDING_BUY_DOES_NOT_VERIFY =
  "Buying this sticker does not verify you.";

export const FOUNDING_STICKER_NO_CALENDAR_EXPIRY =
  "Founding artifact QRs do not calendar-expire";

/**
 * @param {number} count
 * @param {string} [who]
 */
export function inboxAriaManagingInOtherTab(count, who = "") {
  const suffix = who ? ` (${who})` : "";
  if (count > 1) return `managing in ${count} other tabs${suffix}`;
  return `managing in 1 other tab${suffix}`;
}

/** @param {string} [who] */
export function inboxAriaOwnershipNotSaved(who = "") {
  const suffix = who ? ` (${who})` : "";
  return `ownership not saved on device${suffix}`;
}

/** @param {string} [who] */
export function inboxAriaOrphanManagingOtherTab(who = "") {
  const suffix = who ? ` (${who})` : "";
  return `still managing in another tab${suffix}`;
}

/**
 * @param {number} count
 */
export function savedObjectsAttestationNudge(count) {
  return `${count} saved objects · pick one for scan auto-load`;
}

/**
 * @param {string} hereSnippet
 * @param {string} thereSnippet
 */
export function otherTabSwitchConfirmMessage(hereSnippet, thereSnippet) {
  return (
    `This tab already has control active (${hereSnippet}…). ` +
    `Bring the other tab forward for ${thereSnippet}…? Control here stays until you close this tab.`
  );
}

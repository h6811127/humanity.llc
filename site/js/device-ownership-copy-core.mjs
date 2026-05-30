/**
 * Layer 2 ownership copy shared across device shell modules.
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md § Terminology map · D7 · D9g
 */

export const OWNERSHIP_NOT_LOADED_TAB = "Ownership not loaded in this tab.";

/** Hub / shell prominence when wallet has control but tab is empty (Safari P1-2 step 1). */
export const OWNERSHIP_NOT_IN_TAB_PROMPT =
  "Ownership not in this tab — tap to restore";

export const OWNERSHIP_NOT_IN_TAB_SUBTITLE =
  "Your ownership is saved on this device. Load control here to manage or attest.";

export const RESTORE_CONTROL_ACTION = "Restore control";

export const RESTORE_CONTROL_HERE = "Restore control here";

export const TAKE_CONTROL_HERE = "Take control here";

export const TAKE_CONTROL_HERE_ATTEST =
  "Take control here to attest, or create a card.";

/** @deprecated Use `OWNERSHIP_NOT_IN_TAB_PROMPT` (Layer 2). */
export const KEYS_NOT_IN_THIS_TAB_TITLE = "Keys not in this tab";

/** @deprecated Use `OWNERSHIP_NOT_IN_TAB_SUBTITLE`. */
export const KEYS_NOT_IN_THIS_TAB_RESTORE_SUBTITLE =
  "Tap to restore control in this tab";

export const RESTORE_CONTROL_IN_THIS_TAB = "Restore control in this tab";

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

/** Wallet empty — true wipe / never saved (Flow C · P0-7). */
export const VIEW_ONLY_NO_SESSION_WALLET_EMPTY =
  "Import your recovery code or encrypted backup file in Manage below. humanity.llc cannot restore your object without a backup you saved at create.";

/** Wallet has signing rows but this tab cannot sign (P0-7). */
export const VIEW_ONLY_NO_SESSION_WALLET_SAVED =
  'Ownership is saved on this device but not in this tab. Open <a href="/wallet/">My objects</a> and tap <strong>Open controls</strong>, or use Restore ownership in Manage below.';

/** @deprecated Use `viewOnlyNoSessionDetailHtml(signingKeyCount)` — kept for copy guards. */
export const VIEW_ONLY_NO_SESSION_DETAIL = VIEW_ONLY_NO_SESSION_WALLET_EMPTY;

export const VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY =
  "Read-only network snapshot and restore paths. Signing controls appear after you restore ownership in this tab.";

export const VIEW_ONLY_MANAGE_TAB_LEAD_SAVED =
  "Read-only network snapshot. Your ownership is still saved on this device — restore control in this tab below or open My objects and tap Open controls.";

/** @deprecated Use `viewOnlyManageTabLead(signingKeyCount)`. */
export const VIEW_ONLY_MANAGE_TAB_LEAD = VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY;

export const VIEW_ONLY_RESTORE_LEAD_EMPTY =
  "Paste the recovery code you saved at create, or import an encrypted backup file. humanity.llc cannot restore your object for you.";

export const VIEW_ONLY_RESTORE_LEAD_SAVED =
  "Your ownership is still saved on this device. Use Restore ownership below or open My objects and tap Open controls to sign in this tab.";

/** @deprecated Use `viewOnlyRestoreLead(signingKeyCount)`. */
export const VIEW_ONLY_RESTORE_LEAD = VIEW_ONLY_RESTORE_LEAD_EMPTY;

/** Live tab banner when viewing without signing keys (OWNERSHIP_RESTORE Phase 3). */
export const VIEW_ONLY_LIVE_TAB_LEAD =
  "Read-only view of your live object. Use the QR and deploy tasks below, or open Manage to restore ownership and update.";

/** Setup wizard protect step (Phase 2 · K7). */
export const SETUP_SEATBELT_PANEL_LEAD =
  "Before your object goes live, save a recovery path. humanity.llc cannot restore your card if you lose this browser tab.";

export const SETUP_SEATBELT_RECOVERY_HINT =
  "Copy your recovery code and check the box when you have saved it somewhere safe (password manager or paper).";

export const SETUP_SEATBELT_BACKUP_HINT =
  "Or download an encrypted backup file with a passphrase you will remember.";

export const SETUP_SEATBELT_BLOCK_CONTINUE =
  "Save a recovery code or download an encrypted backup before continuing.";

export const SETUP_SEATBELT_RECOVERY_SAVED_STATUS =
  "Recovery code marked saved. You can also download an encrypted backup below.";

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

export const FOUNDING_QR_NOT_OWNER_PROOF =
  "Anyone holding the item can be scanned";

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

/** Hub when `hc_wallet` JSON cannot be parsed (R7 · Safari P1-4). */
export const WALLET_CORRUPT_HUB_EYEBROW = "Saved ownership unreadable";

export const WALLET_CORRUPT_HUB_TITLE =
  "Ownership data on this device could not be read";

export const WALLET_CORRUPT_HUB_DETAIL =
  "Local storage for saved cards is damaged. Import an encrypted backup or recovery code below — humanity.llc cannot repair this browser file.";

/** Hub / wallet empty state — Layer 2 (D9). @see docs/HUB_STRANGER_ONBOARDING.md */
export const HUB_PINS_BOOKMARKS_ONLY = "Bookmarks only — cannot manage objects";

/** Hub backup import summary line (Phase 4). */
export const HUB_RESTORE_IMPORT_SUMMARY = "Restore root card and object controls";

/** Hub backup import hint — aligns with view-only restore copy (Phase 4). */
export const HUB_RESTORE_IMPORT_HINT =
  "Encrypted backup (.hcbackup.json) restores root card and object controls in this tab. humanity.llc cannot restore without a file you saved at create. Never uploaded.";

/** Hub intro coachmark — strangers with nothing saved yet (P2). */
export const HUB_INTRO_BODY_STRANGER =
  "Create a live object first. Later, tap the dot to open what is saved on this device.";

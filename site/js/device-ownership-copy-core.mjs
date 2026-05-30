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

export const VIEW_ONLY_LIVE_QR_TASKS_LEAD =
  "Preview or share this QR without signing. To change what scanners see, restore ownership under Manage.";

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

/** Setup protect step — iOS Safari storage eviction (RC-3). */
export const SETUP_SEATBELT_IOS_SAFARI_HINT =
  "On iPhone Safari, saved cards can be deleted after about seven days without a visit, or when storage is low. If you add humanity.llc to your Home Screen, use only that icon — Safari tabs are a separate copy. Keep your recovery code or encrypted backup.";

/** Setup done step — Home Screen guidance after first live (RC-3). */
export const SETUP_DONE_IOS_HOME_SCREEN_EYEBROW = "iPhone tip";

export const SETUP_DONE_IOS_HOME_SCREEN_TITLE =
  "Add to Home Screen after you finish here";

export const SETUP_DONE_IOS_HOME_SCREEN_DETAIL =
  "Tap Share → Add to Home Screen, then manage your cards only from that icon. To vouch from a printed QR in the app, use Scan QR to vouch in Restore & scan — not your camera alone. Safari tabs keep a separate copy. Keep your recovery backup.";

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

/** /wallet/ tab hint when `hc_wallet` is corrupt (P1-4 step 2). */
export const WALLET_CORRUPT_PAGE_DETAIL =
  "Saved cards on this device could not be read. Import a backup file below or open Backup help.";

export const WALLET_CORRUPT_IMPORT_CTA = "Import backup";

export const WALLET_CORRUPT_HELP_CTA = "Backup help";

export const WALLET_CORRUPT_HELP_HREF = "/help/#ownership";

/** PWA vs Safari signing context split (P2-2 · R5). */
export const RESTORE_CONTROL_IN_THIS_APP = "Restore control in this app";

export const PWA_MISMATCH_TITLE_STANDALONE =
  "Use only this app on iPhone";

export const PWA_MISMATCH_DETAIL_STANDALONE =
  "On iPhone, Safari and this home screen app keep separate saved cards. Do not also create or manage cards in Safari tabs. Restore control here to sign in this app.";

export const PWA_MISMATCH_TITLE_BROWSER =
  "Use your Home Screen app on iPhone";

export const PWA_MISMATCH_DETAIL_BROWSER =
  "On iPhone, Safari and the installed app do not share saved cards. After Add to Home Screen, open humanity.llc only from that icon — not Safari. To use Safari again, export a backup from the home screen app and import it here.";

/** Safari tab with no wallet rows after the user last signed in the home screen app (iOS storage split). */
export const PWA_MISMATCH_TITLE_BROWSER_EMPTY =
  "Your cards are in the Home Screen app";

export const PWA_MISMATCH_DETAIL_BROWSER_EMPTY =
  "On iPhone, Safari and the installed app keep separate saved cards. Open humanity.llc from your home screen icon — not this Safari tab. To manage cards here instead, export a backup from the app and import it below.";

/** iOS Safari ITP storage eviction notice (P2-1 · R4). */
export const SAFARI_ITP_NOTICE_EYEBROW = "iPhone storage";

export const SAFARI_ITP_NOTICE_TITLE = "On iPhone, pick one app";

export const SAFARI_ITP_NOTICE_DETAIL_BROWSER =
  "Safari and your Home Screen app store cards separately. If you added humanity.llc to your Home Screen, use only that icon — not Safari tabs. Safari may also delete saved cards after about seven days without a visit. Keep an encrypted backup.";

export const SAFARI_ITP_NOTICE_DETAIL_STANDALONE =
  "Use only this home screen icon on iPhone — not Safari tabs. iOS keeps them as separate saved wallets. Open this app regularly so iOS does not clear storage. Keep an encrypted backup.";

/** iOS Safari persist() denied — saved ownership may be evicted (RC-2). */
export const STORAGE_PERSIST_DENIED_EYEBROW = "iPhone storage";

export const STORAGE_PERSIST_DENIED_TITLE = "Saved ownership may not stay on this iPhone";

export const STORAGE_PERSIST_DENIED_DETAIL_BROWSER =
  "Safari would not keep this site's storage durable. iOS may delete saved cards after you background the browser or when storage is low. Add humanity.llc to your Home Screen, open the app after each save, and export an encrypted backup before relying on this phone.";

export const STORAGE_PERSIST_DENIED_DETAIL_STANDALONE =
  "This app could not mark its storage as durable. iOS may delete saved cards when storage is low or after long background time. Open humanity.llc from your Home Screen after each save and keep an encrypted backup if you rely on this phone.";

/** Setup wizard — wallet save gate (RC-4 · K7). */
export const SETUP_WALLET_SAVE_REQUIRED =
  "Save your control key on this device before continuing.";

export const SETUP_WALLET_SAVED_CONFIRMATION = "Saved on this device.";

export const SETUP_WALLET_SAVED_DONE_DETAIL =
  "Your control key is saved on this device. Open card controls when you are ready.";

/** Private / ephemeral browsing — create and save blocked (RC-6). */
export const EPHEMERAL_BROWSING_EYEBROW = "Private browsing";

export const EPHEMERAL_BROWSING_TITLE =
  "This browser will not keep saved ownership";

export const EPHEMERAL_BROWSING_DETAIL =
  "Private or temporary browsing modes delete site storage when you close the tab. Open humanity.llc in a normal browser window to create cards and save control on this device.";

export const EPHEMERAL_BROWSING_CREATE_BLOCKED =
  "Cannot create in private browsing — ownership cannot be saved on this device. Open humanity.llc in a normal browser window and try again.";

export const EPHEMERAL_BROWSING_SAVE_BLOCKED =
  "Cannot save ownership in private browsing — it will not stay on this device. Open humanity.llc in a normal browser window and save again.";

/** Hub / wallet empty state — Layer 2 (D9). @see docs/HUB_STRANGER_ONBOARDING.md */
export const HUB_PINS_BOOKMARKS_ONLY = "Bookmarks only — cannot manage objects";

/** Hub restore group label (backup + steward scan handoff · S4). */
export const HUB_RESTORE_GROUP_LABEL = "Restore & scan";

/** Hub steward vouch guidance — Home Screen PWA on iPhone (S4). */
export const HUB_STEWARD_VOUCH_GUIDANCE_EYEBROW = "Printed QR on iPhone";

export const HUB_STEWARD_VOUCH_GUIDANCE_TITLE = "Vouch from this app";

export const HUB_STEWARD_VOUCH_GUIDANCE_DETAIL =
  "Your camera opens Safari, which does not share cards with this Home Screen app. Tap Scan QR to vouch above — or Open scan link after copying the URL in Safari.";

/** Hub steward vouch guidance — Safari browser on iPhone (S4). */
export const HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_TITLE = "Your card is here — use this browser";

export const HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_DETAIL =
  "Your camera opens this Safari tab. Keep your steward card saved here before you vouch. If you use the Home Screen app instead, vouch from Scan QR to vouch there — not the Camera app alone.";

/** PWA install card — iOS manual Add to Home Screen detail (S4). */
export const PWA_INSTALL_IOS_DETAIL =
  "Same keys and inbox — no account. Tap Share → Add to Home Screen. On iPhone, use only that home screen icon afterward. To vouch from prints, use Scan QR to vouch in the app — not your camera alone.";

/** Hub backup import summary line (Phase 4). */
export const HUB_RESTORE_IMPORT_SUMMARY = "Encrypted backup file";

/** Hub backup import hint — aligns with view-only restore copy (Phase 4). */
export const HUB_RESTORE_IMPORT_HINT =
  "Choose the .hcbackup.json file and passphrase you saved at create. Restores full control in this app.";

/** Hub recovery import summary (cross-context · iOS PWA handoff). */
export const HUB_RESTORE_RECOVERY_SUMMARY = "Recovery code (no file)";

/** Hub recovery import hint — primary cross-device path without file transfer. */
export const HUB_RESTORE_RECOVERY_HINT =
  "Paste your scan link (or profile ID) and the recovery code you saved at create. Works across Safari and your Home Screen app — no file transfer.";

/** Hub open scan link — after iPhone camera opens Safari (PWA handoff). */
export const HUB_OPEN_SCAN_SUMMARY = "Open a scan in this app";

export const HUB_OPEN_SCAN_HINT =
  "After your camera opens Safari, copy the scan link there, then paste it here to open the same scan in your Home Screen app — where your steward card lives.";

/** Vouch / attest when iPhone camera landed in Safari with empty wallet. */
export const VOUCH_PWA_CAMERA_HANDOFF_LEAD =
  "Your camera opened Safari, but your steward card is in your Home Screen app. iPhone keeps them separate — you cannot attest from Safari alone.";

export const VOUCH_PWA_CAMERA_HANDOFF_STEPS =
  "Copy this scan link → open humanity.llc from your Home Screen → tap the status dot → Open scan link → paste → attest.";

/** Safari steward landing with `?hc_steward=1` (S5). */
export const VOUCH_PWA_STEWARD_PARAM_HANDOFF_LEAD =
  "This scan is for stewards who vouch from a Home Screen app. Your camera opened Safari — your steward card is not in this tab.";

export const VOUCH_PWA_STEWARD_PARAM_HANDOFF_STEPS =
  "Copy this scan link → open humanity.llc from your Home Screen icon → status dot → Open scan link → paste → attest.";

/** Short handoff interstitial `/v/{code}` (S6). */
export const STEWARD_HANDOFF_INTERSTITIAL_EYEBROW = "Steward scan";

export const STEWARD_HANDOFF_INTERSTITIAL_TITLE =
  "Open this scan in your Home Screen app";

export const STEWARD_HANDOFF_INTERSTITIAL_DETAIL =
  "Your camera opened Safari. On iPhone, your steward card lives in the Home Screen app — not this tab. Copy the scan link below, switch apps, then paste under Open scan link.";

export const STEWARD_HANDOFF_INTERSTITIAL_CONTINUE = "Continue to scan page";

export const STEWARD_HANDOFF_INTERSTITIAL_COPY = "Copy scan link";

/** Dual-QR print materials on /created/ (S7). */
export const DUAL_QR_SECTION_LEAD =
  "Print the public QR for strangers. Optionally add a steward handoff QR on internal collateral only — never replace the public code.";

export const DUAL_QR_PUBLIC_LABEL = "Public scan";

export const DUAL_QR_PUBLIC_HINT =
  "For strangers — outward-facing print. Encodes the standard https scan link.";

export const DUAL_QR_STEWARD_LABEL = "Steward handoff";

export const DUAL_QR_STEWARD_HINT =
  "Internal only — shorter link for stewards who vouch from a Home Screen app. Opens a Safari handoff page.";

export const COPY_STEWARD_HANDOFF_LINK = "Copy steward handoff link";

export const DOWNLOAD_STEWARD_QR = "Download steward QR";

export const DOWNLOAD_PUBLIC_QR = "Download public QR";

/** Hub in-app QR scanner (S3). */
export const HUB_SCAN_QR_BTN = "Scan QR to vouch";

export const HUB_SCAN_QR_DIALOG_TITLE = "Scan a Humanity QR";

export const HUB_SCAN_QR_DIALOG_LEAD =
  "Point at a printed or on-screen scan QR. The scan page opens in this app with your saved card.";

export const HUB_SCAN_QR_UNSUPPORTED =
  "Camera scan is not available in this browser. In the hub, open Restore & scan → Open scan link and paste the URL.";

export const HUB_SCAN_QR_PERMISSION_DENIED =
  "Camera access was denied. Allow camera in Settings, or use Open scan link below.";

/** Glance popover fast path to in-app scanner (Phase A). */
export const HUB_GLANCE_SCAN_QR_TITLE = "Scan a Humanity QR";

export const HUB_GLANCE_SCAN_QR_SUB = "Vouch from a printed code";

/** Top chrome scan icon (Phase B · standalone PWA). */
export const HUB_CHROME_SCAN_QR_ARIA = "Scan to vouch";

/** Hub intro coachmark — strangers with nothing saved yet (P2). */
export const HUB_INTRO_BODY_STRANGER =
  "Create a live object first. Later, tap the dot to open what is saved on this device.";

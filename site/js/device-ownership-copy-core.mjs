/**
 * Layer 2 ownership copy shared across device shell modules.
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md § Terminology map · D7 · D9g
 */
import { walletEntryNeedsDeviceUnlock } from "./device-custody-mode-core.mjs?v=94";
import {
  inboxAriaManagingInOtherContext,
  inboxAriaOrphanManagingElsewhere,
} from "./device-shell-copy-core.mjs?v=94";

export const OWNERSHIP_NOT_LOADED_TAB = "Ownership not loaded in this tab.";

/** Hub / shell when wallet has keys but this tab cannot sign (WS-QUALITY view-only step 3). */
export const OWNERSHIP_NOT_IN_TAB_PROMPT = "Ownership saved on this device";

export const OWNERSHIP_NOT_IN_TAB_SUBTITLE =
  "Tap Open controls to manage or attest on this phone.";

/** Primary shell CTA — navigates to /created/ with unlock when needed. */
export const OPEN_CONTROLS_ACTION = "Open controls";

export const OPEN_CONTROLS_HERE = "Open controls";

/** @deprecated Use OPEN_CONTROLS_ACTION */
export const RESTORE_CONTROL_ACTION = OPEN_CONTROLS_ACTION;

/** @deprecated Use OPEN_CONTROLS_HERE */
export const RESTORE_CONTROL_HERE = OPEN_CONTROLS_HERE;

export const TAKE_CONTROL_HERE = "Take control here";

export const TAKE_CONTROL_HERE_ATTEST =
  "Take control here to attest, or create a card.";

/** @deprecated Use `OWNERSHIP_NOT_IN_TAB_PROMPT` (Layer 2). */
export const KEYS_NOT_IN_THIS_TAB_TITLE = "Keys not in this tab";

/** @deprecated Use `OWNERSHIP_NOT_IN_TAB_SUBTITLE`. */
export const KEYS_NOT_IN_THIS_TAB_RESTORE_SUBTITLE = OWNERSHIP_NOT_IN_TAB_SUBTITLE;

/** @deprecated Use OPEN_CONTROLS_ACTION */
export const RESTORE_CONTROL_IN_THIS_TAB = OPEN_CONTROLS_ACTION;

/** device_unlock — Layer 2 (WS-CUSTODY C1). */
export const UNLOCK_TO_MANAGE = "Unlock to manage";

export const UNLOCK_TO_MANAGE_HERE = "Unlock to manage here";

export const UNLOCK_TO_MANAGE_IN_THIS_TAB = "Unlock to manage in this tab";

export const UNLOCK_TO_MANAGE_IN_THIS_APP = "Unlock to manage in this app";

export const UNLOCK_TO_MANAGE_PROMPT =
  "Unlock to manage. Tap to use Face ID / Touch ID";

export const UNLOCK_NOT_IN_TAB_SUBTITLE =
  "Your object is saved on this device. Unlock here to manage or attest.";

/** /created/ Manage — custody mode migration (C3). */
export const CUSTODY_MIGRATE_MODE_DEVICE_UNLOCK =
  "This device (Face ID / Touch ID)";

export const CUSTODY_MIGRATE_MODE_FULL_KEYS = "Full control keys";

export const CUSTODY_MIGRATE_SUMMARY_DEVICE_UNLOCK =
  "Passkey-wrapped. Unlock to manage";

export const CUSTODY_MIGRATE_SUMMARY_FULL_KEYS =
  "Raw signing key saved in this browser";

export const CUSTODY_MIGRATE_TO_FULL_KEYS_LEAD =
  "Store the raw signing key in this browser wallet. Use only if you need export tools or steward workflows. Keep a recovery code or encrypted backup first.";

export const CUSTODY_MIGRATE_TO_DEVICE_UNLOCK_LEAD =
  "Wrap your signing key behind Face ID or Touch ID on this device. Raw keys will be removed from saved wallet storage.";

export const CUSTODY_MIGRATE_FULL_KEYS_ACK =
  "I have a recovery code or encrypted backup for this object";

export const CUSTODY_MIGRATE_UNLOCK_FIRST_HINT =
  "Unlock in this tab first (Face ID / Touch ID), then you can switch custody mode.";

/** C4 — new phone / recovery import without synced passkey. */
export const CUSTODY_REENROLL_DEVICE_UNLOCK_LEAD =
  "This object used Face ID on another device. Import your encrypted backup here, then enroll a passkey on this phone.";

export const CUSTODY_REENROLL_DEVICE_UNLOCK_BTN = "Set up Face ID on this device";

export const CUSTODY_REENROLL_NEED_BACKUP_HINT =
  "Import your encrypted backup on Manage first. Recovery code alone cannot enroll a new passkey.";

/** /create/ pre-submit trust stack (P0). */
export const CREATE_PUBLIC_CARD_NOTICE =
  "Your @name and message will be public. Save on this device after create. We can't restore access if you lose this tab.";

export const CREATE_RECOVERY_HINT_DEVICE_UNLOCK =
  "You'll save a backup on the next screen. Backups are not stored by humanity.llc.";

export const CREATE_RECOVERY_LABEL_DEVICE_UNLOCK = "Include backup (required for this device)";

export const CREATE_RECOVERY_HINT_FULL_KEYS =
  "Recommended for show-keys mode. Save on the next screen.";

export const CREATE_RECOVERY_LABEL_FULL_KEYS = "Include backup (optional)";

export const CREATE_CUSTODY_SUMMARY = "Use this device to manage updates.";

/** /create/ Device control hints — Advanced disclosure (G-C3 · K12). */
export const CREATE_CUSTODY_DEVICE_UNLOCK_DEFAULT_HINT =
  "Face ID or Touch ID on this phone unlocks updates. You won't see raw keys in normal use.";

export const CREATE_CUSTODY_ORGANIZER_FULL_KEYS_HINT =
  "Organizer turn-off permission requires show-keys mode on this device.";

export const CREATE_CUSTODY_GAME_SEASON_FULL_KEYS_HINT =
  "City game seasons require show-keys mode so season operator access stays available on Live.";

export const CREATE_CUSTODY_WEBAUTHN_UNAVAILABLE_HINT =
  "This browser cannot use Face ID / Touch ID. Show keys (advanced) will be used.";

/** Alert when /created/ setup save would enroll Face ID during game season flow. */
export const GAME_SEASON_FACE_ID_SAVE_BLOCKED_MESSAGE =
  "City game seasons can't use Face ID only. Choose full control keys when you save. You need the game-operator key for registering nodes on Live.";

/** /create/ — when organizer revoke blocks Face ID (organizer + WebAuthn available). */
export const CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_EYEBROW = "Face ID unavailable";

export const CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_TITLE =
  "Organizer turn-off uses show-keys mode";

export const CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_DETAIL =
  "Turn off organizer turn-off permission above to choose This device (recommended).";

export const CREATE_CUSTODY_ORGANIZER_FACE_ID_CALLOUT_ACTION =
  "Go to organizer revoke setting";

/** /create/?intent=game — Face ID blocked for season organizer flow. */
export const CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_EYEBROW = "Face ID unavailable";

export const CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_TITLE =
  "City game seasons use show-keys mode";

export const CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_DETAIL =
  "Season setup needs operator access on this device. This device (recommended) is not available for city game seasons.";

export const CREATE_CUSTODY_GAME_SEASON_FACE_ID_CALLOUT_ACTION =
  "Use show keys (advanced)";

export const HUB_RECOVERY_DEVICE_UNLOCK_REENROLL_HINT =
  "Recovery saved. Import your encrypted backup, then set up Face ID on this device in Manage.";

/** C4 — hub / wallet when recovery imported but passkey not enrolled on this device (K11). */
export const DEVICE_UNLOCK_REENROLL_PROMPT = "Set up Face ID on this device";

export const DEVICE_UNLOCK_REENROLL_SUBTITLE =
  "Recovery saved on this device. Import your encrypted backup, then enroll a passkey in Manage.";

export const DEVICE_UNLOCK_REENROLL_IN_THIS_TAB = "Import encrypted backup";

export const DEVICE_UNLOCK_REENROLL_ON_SCAN = "Import backup to set up Face ID";

export const DEVICE_UNLOCK_REENROLL_IN_THIS_APP = "Import backup in this app";

/**
 * @param {Record<string, unknown> | null | undefined} entry
 * @param {{ scan?: boolean, pwa?: boolean }} [ctx]
 */
export function controlActivationLabelForEntry(entry, ctx = {}) {
  if (walletEntryNeedsDeviceUnlock(entry)) {
    if (ctx.pwa) return UNLOCK_TO_MANAGE_IN_THIS_APP;
    if (ctx.scan) return UNLOCK_TO_MANAGE_HERE;
    return UNLOCK_TO_MANAGE_IN_THIS_TAB;
  }
  if (ctx.pwa) return OPEN_CONTROLS_ACTION;
  if (ctx.scan) return OPEN_CONTROLS_HERE;
  return OPEN_CONTROLS_ACTION;
}

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
  'Ownership is saved on this device. Open <a href="/wallet/">My objects</a> and tap <strong>Open controls</strong> to manage.';

/** device_unlock — wallet saved, tab locked (WS-CUSTODY C2). */
export const VIEW_ONLY_NO_SESSION_WALLET_DEVICE_UNLOCK =
  'This object is saved on this device but locked behind Face ID / Touch ID. Tap <strong>Unlock to manage</strong> below or open <a href="/wallet/">My objects</a>.';

/** @deprecated Use `viewOnlyNoSessionDetailHtml(signingKeyCount)` — kept for copy guards. */
export const VIEW_ONLY_NO_SESSION_DETAIL = VIEW_ONLY_NO_SESSION_WALLET_EMPTY;

export const VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY =
  "Read-only network snapshot. Import your recovery code or encrypted backup below to manage this card.";

export const VIEW_ONLY_MANAGE_TAB_LEAD_SAVED =
  "Read-only network snapshot. Open My objects and tap Open controls to manage on this phone.";

export const VIEW_ONLY_MANAGE_TAB_LEAD_DEVICE_UNLOCK =
  "Read-only network snapshot. Unlock below with Face ID or Touch ID to manage in this tab.";

/** @deprecated Use `viewOnlyManageTabLead(signingKeyCount)`. */
export const VIEW_ONLY_MANAGE_TAB_LEAD = VIEW_ONLY_MANAGE_TAB_LEAD_EMPTY;

export const VIEW_ONLY_LIVE_QR_TASKS_LEAD =
  "Preview or share this QR without signing. To manage or change what scanners see, import recovery on Manage or open My objects.";

export const VIEW_ONLY_RESTORE_LEAD_EMPTY =
  "Paste the recovery code you saved at create, or import an encrypted backup file. humanity.llc cannot restore your object for you.";

/** @deprecated Restore-in-tab panel removed (WS-QUALITY view-only deprecation step 2). */
export const VIEW_ONLY_RESTORE_LEAD_SAVED =
  "Your ownership is still saved on this device. Open My objects and tap Open controls.";

export const VIEW_ONLY_RESTORE_LEAD_DEVICE_UNLOCK =
  "Your object is saved on this device. Unlock with Face ID or Touch ID below to manage in this tab.";

/** @deprecated Use `viewOnlyRestoreLead(signingKeyCount)`. */
export const VIEW_ONLY_RESTORE_LEAD = VIEW_ONLY_RESTORE_LEAD_EMPTY;

/** Live tab banner when viewing without signing keys (OWNERSHIP_RESTORE Phase 3). */
export const VIEW_ONLY_LIVE_TAB_LEAD =
  "Read-only view of your live object. Use the QR and deploy tasks below, or open Manage to import recovery and update.";

/** Setup wizard protect step (Phase 2 · K7 · WS-CUSTODY C0). */
export const SETUP_SEATBELT_PANEL_LEAD =
  "Before your object goes live, save a recovery method. Your phone holds control. Humanity.llc cannot restore it if this device is lost.";

/** Protect step — device_unlock (WS-CUSTODY G-C1). */
export const SETUP_SEATBELT_DEVICE_UNLOCK_LEAD =
  "Before your object goes live, confirm your recovery method. Face ID locks signing on this device. Humanity.llc cannot restore it if you lose the phone and skip backup.";

export const CUSTODY_RECOVERY_DEVICE_UNLOCK_PLATFORM_SYNC =
  "Face ID on this device is not a Humanity recovery path. Save the recovery code below or download an encrypted backup before going live.";

/** Protect step — passkey / platform sync is not operator recovery (C0). */
export const CUSTODY_RECOVERY_NOT_PLATFORM_SYNC =
  "Face ID, passkeys, and iCloud or Google sync are not a Humanity recovery path. Save the recovery code below or download an encrypted backup.";

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
  "On iPhone Safari, saved cards can be deleted after about seven days without a visit, or when storage is low. If you add humanity.llc to your Home Screen, use only that icon · Safari tabs are a separate copy. Keep your recovery code or encrypted backup.";

/** Setup done step — Home Screen guidance after first live (RC-3). */
export const SETUP_DONE_IOS_HOME_SCREEN_EYEBROW = "iPhone tip";

export const SETUP_DONE_IOS_HOME_SCREEN_TITLE =
  "Add to Home Screen after you finish here";

export const SETUP_DONE_IOS_HOME_SCREEN_DETAIL =
  "Tap Share → Add to Home Screen, then manage your cards only from that icon. Never remove it to refresh. Pull down in the app instead. Keep your recovery backup. For printed QRs, tap the scan icon in the app. Not your camera alone.";

/** Setup QR step — prefer in-app scan after print (WS-CUSTODY C0). */
export const SETUP_PRINT_IN_APP_HINT =
  "After you print: use the scan icon in this app to test your sticker. On iPhone, the Camera app opens a new Safari tab and can break control.";

/** Setup test-scan step (WS-CUSTODY C0). */
export const SETUP_TEST_SCAN_PANEL_TITLE = "Test your QR";

export const SETUP_TEST_SCAN_PANEL_LEAD =
  "See what scanners see. On this phone, scan with the app first so you stay in one place with your saved control.";

export const SETUP_TEST_SCAN_IN_APP_LABEL = "Scan with this app";

export const SETUP_TEST_SCAN_EXTERNAL_LABEL = "Preview in browser tab";

export const SETUP_TEST_SCAN_HINT =
  "Optional preview. Tap Continue when you are ready to save recovery. You do not need to scan first.";

export const SETUP_PRINT_DEVICE_UNLOCK_HINT =
  "After you print: unlock with Face ID on this device when you update status. Strangers only see the scan page.";

export const SETUP_TEST_SCAN_DEVICE_UNLOCK_LEAD =
  "Preview what scanners see. Face ID unlock is separate from the public scan page.";

export const SETUP_TEST_SCAN_DEVICE_UNLOCK_HINT =
  "Use in-app scan to stay in humanity.llc, or open the scan page in a browser tab.";

export const SETUP_DONE_DEVICE_UNLOCK_IOS_DETAIL =
  "Add to Home Screen and open cards only from that icon. Face ID unlock applies in this app. Keep your recovery backup.";

export const DEVICE_UNLOCK_WEBAUTHN_CANCELED_HINT =
  "Face ID was canceled. Your card is still here. Try again when you are ready to unlock.";

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
  "Checking whether you have control of your identity in this tab. Steward and Vouched Human are network checks, separate from attestation. " +
  "Use <strong>Attest as…</strong> or <a href=\"WALLET_HREF\">My objects</a>. " +
  "Only the signed attestation is sent; your control stays on this device.";

/** Live control scanner lead (M7 comprehension). */
export const LIVE_CONTROL_SCANNER_LEAD =
  "Ask the owner to prove they can respond with control of this object, right now, on the spot.";

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
 * @param {import("./device-shell-copy-core.mjs").ShellSurface} [surface]
 */
export function inboxAriaManagingInOtherTab(count, who = "", surface = "browser") {
  return inboxAriaManagingInOtherContext(count, who, surface);
}

/** @param {string} [who] */
export function inboxAriaOwnershipNotSaved(who = "") {
  const suffix = who ? ` (${who})` : "";
  return `ownership not saved on device${suffix}`;
}

/**
 * @param {string} [who]
 * @param {import("./device-shell-copy-core.mjs").ShellSurface} [surface]
 */
export function inboxAriaOrphanManagingOtherTab(who = "", surface = "browser") {
  return inboxAriaOrphanManagingElsewhere(who, surface);
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
  "Local storage for saved cards is damaged. Import an encrypted backup or recovery code below. Humanity.llc cannot repair this browser file.";

/** /wallet/ tab hint when `hc_wallet` is corrupt (P1-4 step 2). */
export const WALLET_CORRUPT_PAGE_DETAIL =
  "Saved cards on this device could not be read. Import a backup file below or open Backup help.";

export const WALLET_CORRUPT_IMPORT_CTA = "Import backup";

export const WALLET_CORRUPT_HELP_CTA = "Backup help";

export const WALLET_CORRUPT_HELP_HREF = "/help/#ownership";

/** PWA vs Safari signing context split (P2-2 · R5). */
/** @deprecated Use OPEN_CONTROLS_ACTION */
export const RESTORE_CONTROL_IN_THIS_APP = OPEN_CONTROLS_ACTION;

/**
 * iOS Home Screen — removing the icon uninstalls the PWA and deletes hc_wallet in that app.
 * @see docs/PWA_INSTALL.md § iPhone home screen custody
 */
export const IOS_PWA_NEVER_REMOVE_ICON_WITHOUT_BACKUP =
  "Never remove the Home Screen icon to refresh or clear cache. IOS deletes saved cards when you remove it. Pull down to refresh instead. Keep an encrypted backup or recovery code before removing the icon.";

export const PWA_MISMATCH_TITLE_STANDALONE =
  "Use only this app on iPhone";

export const PWA_MISMATCH_DETAIL_STANDALONE =
  "On iPhone, Safari and this home screen app keep separate saved cards. Do not also create or manage cards in Safari tabs. Tap Open controls to manage in this app.";

export const PWA_MISMATCH_TITLE_BROWSER =
  "Use your Home Screen app on iPhone";

export const PWA_MISMATCH_DETAIL_BROWSER =
  "On iPhone, Safari and the installed app do not share saved cards. After Add to Home Screen, open humanity.llc only from that icon. Not Safari. To use Safari again, export a backup from the home screen app and import it here.";

/** Safari tab with no wallet rows after the user last signed in the home screen app (iOS storage split). */
export const PWA_MISMATCH_TITLE_BROWSER_EMPTY =
  "Your cards are in the Home Screen app";

export const PWA_MISMATCH_DETAIL_BROWSER_EMPTY =
  "On iPhone, Safari and the installed app keep separate saved cards. Open humanity.llc from your home screen icon. Not this Safari tab. To manage cards here instead, export a backup from the app and import it below.";

/** iOS Safari ITP storage eviction notice (P2-1 · R4). */
export const SAFARI_ITP_NOTICE_EYEBROW = "iPhone storage";

export const SAFARI_ITP_NOTICE_TITLE = "On iPhone, pick one app";

export const SAFARI_ITP_NOTICE_DETAIL_BROWSER =
  "Safari and your Home Screen app store cards separately. If you added humanity.llc to your Home Screen, use only that icon. Not Safari tabs. Safari may also delete saved cards after about seven days without a visit. Never remove the Home Screen icon to refresh. Pull down in the app instead. Keep an encrypted backup.";

export const SAFARI_ITP_NOTICE_DETAIL_STANDALONE =
  "Use only this home screen icon on iPhone. Not Safari tabs. IOS keeps them as separate saved wallets. Open this app regularly so iOS does not clear storage. Never remove this icon to refresh. Pull down instead; iOS deletes saved cards when you remove it. Keep an encrypted backup.";

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
  "Your control key is saved on this device. Continue when you are ready.";

/** Setup wizard — Manage tab unlocks after setup (RC-13). */
export const SETUP_MANAGE_TAB_HINT =
  "Revoke, recovery, and steward tools unlock under the Manage tab after you tap Continue.";

/** Setup done panel — Live vs Manage split (RC-13). */
export const SETUP_DONE_PANEL_LEAD =
  "Object now resolves live on the network. The same QR stays valid as status changes. Update copy on Live; revoke, recovery, and steward tools are under Manage.";

/** Live control proof — keys missing in this tab (RC-13 copy alignment). */
export const LIVE_CONTROL_SIGNING_KEYS_MISSING =
  "Open this proof link in the original created tab, or unlock a saved recovery key or encrypted backup in Manage. humanity.llc cannot prove control for you.";

/** Status dot steward queue pointer (RC-13 copy alignment). */
export const STEWARD_REVIEW_QUEUE_MANAGE_HINT =
  "Operator review queue is under Manage on Open controls.";

/** Private / ephemeral browsing — create and save blocked (RC-6). */
export const EPHEMERAL_BROWSING_EYEBROW = "Private browsing";

export const EPHEMERAL_BROWSING_TITLE =
  "This browser will not keep saved ownership";

export const EPHEMERAL_BROWSING_DETAIL =
  "Private or temporary browsing modes delete site storage when you close the tab. Open humanity.llc in a normal browser window to create cards and save control on this device.";

export const EPHEMERAL_BROWSING_CREATE_BLOCKED =
  "Cannot create in private browsing. Ownership cannot be saved on this device. Open humanity.llc in a normal browser window and try again.";

export const EPHEMERAL_BROWSING_SAVE_BLOCKED =
  "Cannot save ownership in private browsing. It will not stay on this device. Open humanity.llc in a normal browser window and save again.";

/** Hub / wallet empty state — Layer 2 (D9). @see docs/HUB_STRANGER_ONBOARDING.md */
export const HUB_PINS_BOOKMARKS_ONLY = "Bookmarks only. Cannot manage objects";

/** Hub restore group label (backup + steward scan handoff · S4). */
export const HUB_RESTORE_GROUP_LABEL = "Restore & scan";

/** Hub steward vouch guidance — Home Screen PWA on iPhone (S4). */
export const HUB_STEWARD_VOUCH_GUIDANCE_EYEBROW = "Printed QR on iPhone";

export const HUB_STEWARD_VOUCH_GUIDANCE_TITLE = "Vouch from this app";

export const HUB_STEWARD_VOUCH_GUIDANCE_DETAIL =
  "Your camera opens Safari, which does not share cards with this Home Screen app. Tap the scan icon in the top bar. Or use Open scan link after copying the URL in Safari. Never remove this Home Screen icon to refresh. Pull down instead.";

/** Hub steward vouch guidance — Safari browser on iPhone (S4). */
export const HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_TITLE = "Your card is here. Use this browser";

export const HUB_STEWARD_SAFARI_VOUCH_GUIDANCE_DETAIL =
  "Your camera opens this Safari tab. Keep your steward card saved here before you vouch. If you use the Home Screen app instead, use the scan icon in the app. Not the Camera app alone.";

/** PWA install card — iOS manual Add to Home Screen detail (S4). */
export const PWA_INSTALL_IOS_DETAIL =
  "Same keys and inbox. No account. Tap Share → Add to Home Screen, then use only that icon on iPhone. Never remove it to refresh. Pull down instead. Keep a backup. For prints, tap the scan icon in the app. Not your camera alone.";

/** Hub backup import summary line (Phase 4). */
export const HUB_RESTORE_IMPORT_SUMMARY = "Encrypted backup file";

/** Hub backup import hint — aligns with view-only restore copy (Phase 4). */
export const HUB_RESTORE_IMPORT_HINT =
  "Choose the .hcbackup.json file and passphrase you saved at create. Restores full control in this app.";

/** Hub recovery import summary (cross-context · iOS PWA handoff). */
export const HUB_RESTORE_RECOVERY_SUMMARY = "Recovery code (no file)";

/** Hub recovery import hint — primary cross-device path without file transfer. */
export const HUB_RESTORE_RECOVERY_HINT =
  "Paste your scan link (or profile ID) and the recovery code you saved at create. Works across Safari and your Home Screen app. No file transfer.";

/** Scan page — print_artifact owner path to /created/#restore. */
export const SCAN_OWNER_RESTORE_CTA_LABEL = OPEN_CONTROLS_ACTION;

export const SCAN_OWNER_RESTORE_CTA_HINT =
  "Is this your printed object? Open your card page to import a recovery code or encrypted backup. Control stays on this device. Humanity.llc cannot restore keys for you.";

/** Hub open scan link — after iPhone camera opens Safari (PWA handoff). */
export const HUB_OPEN_SCAN_SUMMARY = "Open a scan in this app";

export const HUB_OPEN_SCAN_HINT =
  "After your camera opens Safari, copy the scan link there, then paste it here to open the same scan in your Home Screen app. Where your steward card lives.";

/** Vouch / attest when iPhone camera landed in Safari with empty wallet. */
export const VOUCH_PWA_CAMERA_HANDOFF_LEAD =
  "Your camera opened Safari, but your steward card is in your Home Screen app. IPhone keeps them separate. You cannot attest from Safari alone.";

export const VOUCH_PWA_CAMERA_HANDOFF_STEPS =
  "Copy this scan link → open humanity.llc from your Home Screen → tap the status dot → Open scan link → paste → attest.";

/** Safari steward landing with `?hc_steward=1` (S5). */
export const VOUCH_PWA_STEWARD_PARAM_HANDOFF_LEAD =
  "This scan is for stewards who vouch from a Home Screen app. Your camera opened Safari. Your steward card is not in this tab.";

export const VOUCH_PWA_STEWARD_PARAM_HANDOFF_STEPS =
  "Copy this scan link → open humanity.llc from your Home Screen icon → status dot → Open scan link → paste → attest.";

/** Short handoff interstitial `/v/{code}` (S6). */
export const STEWARD_HANDOFF_INTERSTITIAL_EYEBROW = "Steward scan";

export const STEWARD_HANDOFF_INTERSTITIAL_TITLE =
  "Open this scan in your Home Screen app";

export const STEWARD_HANDOFF_INTERSTITIAL_DETAIL =
  "Your camera opened Safari. On iPhone, your steward card lives in the Home Screen app. Not this tab. Copy the scan link below, switch apps, then paste under Open scan link.";

export const STEWARD_HANDOFF_INTERSTITIAL_CONTINUE = "Continue to scan page";

export const STEWARD_HANDOFF_INTERSTITIAL_COPY = "Copy scan link";

/** Dual-QR print materials on /created/ (S7). */
export const DUAL_QR_SECTION_LEAD =
  "Print the public QR for strangers. Optionally add a steward handoff QR on internal collateral only. Never replace the public code.";

export const DUAL_QR_PUBLIC_LABEL = "Public scan";

export const DUAL_QR_PUBLIC_HINT =
  "For strangers. Outward-facing print. Encodes the standard https scan link.";

export const DUAL_QR_STEWARD_LABEL = "Steward handoff";

export const DUAL_QR_STEWARD_HINT =
  "Internal only. Shorter link for stewards who vouch from a Home Screen app. Opens a Safari handoff page.";

export const COPY_STEWARD_HANDOFF_LINK = "Copy steward handoff link";

export const DOWNLOAD_STEWARD_QR = "Download steward QR";

export const DOWNLOAD_PUBLIC_QR = "Download public QR";

/** Print & share disclosure → Full-size QR steward discovery (RC-2 / S7). */
export const PRINT_SHARE_STEWARD_DISCOVERY =
  "This downloads the public QR for strangers. For an optional steward handoff QR on internal collateral, open Full-size QR below. Never replace the public code on outward-facing print.";

export const PRINT_SHARE_STEWARD_FULL_SIZE_CTA = "View steward handoff QR";

/** Hub in-app QR scanner (S3). */
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

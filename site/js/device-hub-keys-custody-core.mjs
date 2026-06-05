/**
 * Pure hub Keys custody panel model.
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phases 1 + 4
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md D1 — Layer 2 custody copy
 */
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import {
  crossTabAggregateSubtitle,
  crossTabAggregateTitle,
  crossTabPresenceLabel,
} from "./device-cross-tab-copy-core.mjs";
import { shellSurfaceFromStandalone } from "./device-shell-copy-core.mjs";
import {
  ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX,
  ORPHAN_KEYS_INBOX_TITLE,
} from "./device-orphan-keys-nav-core.mjs";
import {
  DEFAULT_FOR_ATTESTATION_ON_SCAN,
  OWNERSHIP_NOT_IN_TAB_PROMPT,
  OWNERSHIP_NOT_IN_TAB_SUBTITLE,
  SET_DEFAULT_FOR_ATTESTATION,
  UNLOCK_NOT_IN_TAB_SUBTITLE,
  UNLOCK_TO_MANAGE_PROMPT,
  DEVICE_UNLOCK_REENROLL_PROMPT,
  DEVICE_UNLOCK_REENROLL_SUBTITLE,
  savedObjectsAttestationNudge,
} from "./device-ownership-copy-core.mjs";
import { walletOwnershipNotInTab } from "./device-ownership-not-in-tab-core.mjs";

/** @typedef {'this_tab_active' | 'this_tab_unsaved' | 'cross_tab' | 'cross_tab_summary' | 'orphan' | 'vouch_default' | 'sign_lock' | 'vouch_nudge' | 'wallet_scale' | 'pwa_session_mismatch' | 'wallet_not_in_tab'} HubKeysCustodyRowKind */

/**
 * @typedef {object} HubKeysCustodyPresenceEntry
 * @property {string} profile_id
 * @property {string} tabId
 * @property {string} [label]
 * @property {string} [handle]
 */

/**
 * @typedef {object} HubKeysCustodyRow
 * @property {HubKeysCustodyRowKind} kind
 * @property {string} title
 * @property {string} subtitle
 * @property {HubKeysCustodyPresenceEntry} [entry]
 * @property {boolean} [canRestoreInThisTab]
 * @property {boolean} [needsDeviceUnlock]
 * @property {boolean} [needsDeviceUnlockReenroll]
 */

/**
 * @typedef {object} HubKeysCustodyPanelState
 * @property {HubKeysCustodyRow[]} rows
 * @property {boolean} showEducation
 * @property {boolean} visible
 */

/**
 * @param {HubKeysCustodyPresenceEntry} entry
 */
/**
 * @param {HubKeysCustodyPresenceEntry} entry
 * @param {import("./device-shell-copy-core.mjs").ShellSurface} [surface]
 */
export function labelForHubKeysCustodyEntry(entry, surface = "browser") {
  return crossTabPresenceLabel(entry, surface);
}

/**
 * @param {{
 *   tabNoticeCount?: number,
 *   crossTabEntries?: HubKeysCustodyPresenceEntry[],
 *   orphanRemovedEntries?: HubKeysCustodyPresenceEntry[],
 *   tabSessionLabel?: string,
 *   hasActiveKeys?: boolean,
 *   educationDismissed?: boolean,
 *   defaultVouchProfileId?: string | null,
 *   defaultVouchLabel?: string | null,
 *   vouchAutoActivate?: boolean,
 *   signLockMode?: "pin" | "webauthn" | null,
 *   signLockLabel?: string | null,
 *   walletEntriesWithKeys?: number,
 *   savedCardCount?: number,
 *   walletScaleHint?: string | null,
 *   walletScaleTitle?: string | null,
 *   pwaSessionMismatchTitle?: string | null,
 *   pwaSessionMismatchDetail?: string | null,
 *   pwaSessionMismatchCanRestore?: boolean,
 *   walletNeedsDeviceUnlock?: boolean,
 *   walletNeedsDeviceUnlockReenroll?: boolean,
 *   standalone?: boolean,
 * }} input
 * @returns {HubKeysCustodyPanelState}
 */
export function buildHubKeysCustodyPanel(input) {
  const {
    tabNoticeCount = 0,
    crossTabEntries = [],
    orphanRemovedEntries = [],
    tabSessionLabel = "This tab",
    standalone = false,
    hasActiveKeys = false,
    educationDismissed = true,
    defaultVouchProfileId = null,
    defaultVouchLabel = null,
    vouchAutoActivate = false,
    signLockMode = null,
    signLockLabel = null,
    walletEntriesWithKeys = 0,
    savedCardCount = 0,
    walletScaleHint: walletScaleHintText = null,
    walletScaleTitle = null,
    pwaSessionMismatchTitle = null,
    pwaSessionMismatchDetail = null,
    pwaSessionMismatchCanRestore = false,
    walletNeedsDeviceUnlock = false,
    walletNeedsDeviceUnlockReenroll = false,
  } = input;
  const surface = shellSurfaceFromStandalone(standalone);

  /** @type {HubKeysCustodyRow[]} */
  const rows = [];

  if (tabNoticeCount > 0 && hasActiveKeys) {
    rows.push({
      kind: "this_tab_unsaved",
      title: "Control active · Save ownership on this device",
      subtitle: `${tabSessionLabel} · this tab only until you save ownership`,
    });
  } else if (hasActiveKeys) {
    rows.push({
      kind: "this_tab_active",
      title: "You can update these QRs from this browser",
      subtitle: tabSessionLabel,
    });
  }

  const walletNotInTab = walletOwnershipNotInTab(
    walletEntriesWithKeys,
    hasActiveKeys
  );

  if (
    pwaSessionMismatchTitle &&
    pwaSessionMismatchDetail &&
    tabNoticeCount === 0 &&
    crossTabEntries.length === 0 &&
    orphanRemovedEntries.length === 0
  ) {
    rows.push({
      kind: "pwa_session_mismatch",
      title: pwaSessionMismatchTitle,
      subtitle: pwaSessionMismatchDetail,
      canRestoreInThisTab: pwaSessionMismatchCanRestore,
    });
  } else if (
    walletNotInTab &&
    tabNoticeCount === 0 &&
    crossTabEntries.length === 0 &&
    orphanRemovedEntries.length === 0
  ) {
    rows.push({
      kind: "wallet_not_in_tab",
      title: walletNeedsDeviceUnlockReenroll
        ? DEVICE_UNLOCK_REENROLL_PROMPT
        : walletNeedsDeviceUnlock
          ? UNLOCK_TO_MANAGE_PROMPT
          : OWNERSHIP_NOT_IN_TAB_PROMPT,
      subtitle: walletNeedsDeviceUnlockReenroll
        ? DEVICE_UNLOCK_REENROLL_SUBTITLE
        : walletNeedsDeviceUnlock
          ? UNLOCK_NOT_IN_TAB_SUBTITLE
          : OWNERSHIP_NOT_IN_TAB_SUBTITLE,
      needsDeviceUnlock: walletNeedsDeviceUnlock,
      needsDeviceUnlockReenroll: walletNeedsDeviceUnlockReenroll,
    });
  }

  if (shouldShowOrphanRemovedKeysNotice(orphanRemovedEntries.length, tabNoticeCount)) {
    for (const entry of orphanRemovedEntries) {
      const label = labelForHubKeysCustodyEntry(entry, surface);
      rows.push({
        kind: "orphan",
        title: ORPHAN_KEYS_INBOX_TITLE,
        subtitle: `${ORPHAN_KEYS_INBOX_SUBTITLE_PREFIX} · ${label}`,
        entry,
      });
    }
  }

  if (shouldShowCrossTabKeysNotice(crossTabEntries.length, tabNoticeCount)) {
    if (crossTabEntries.length >= 2) {
      rows.push({
        kind: "cross_tab_summary",
        title: crossTabAggregateTitle(crossTabEntries.length, surface),
        subtitle: crossTabAggregateSubtitle(crossTabEntries, { surface }),
      });
    }
    for (const entry of crossTabEntries) {
      const label = labelForHubKeysCustodyEntry(entry, surface);
      rows.push({
        kind: "cross_tab",
        title:
          crossTabEntries.length >= 2 ? label : crossTabAggregateTitle(1, surface),
        subtitle:
          crossTabEntries.length >= 2
            ? crossTabAggregateTitle(1, surface)
            : label,
        entry,
      });
    }
  }

  if (hasActiveKeys && signLockMode) {
    rows.push({
      kind: "sign_lock",
      title:
        signLockMode === "webauthn"
          ? "Device unlock required to take control"
          : "PIN required to take control",
      subtitle: signLockLabel || tabSessionLabel,
    });
  }

  if (defaultVouchProfileId && vouchAutoActivate) {
    rows.push({
      kind: "vouch_default",
      title: DEFAULT_FOR_ATTESTATION_ON_SCAN,
      subtitle:
        defaultVouchLabel ||
        `${String(defaultVouchProfileId).slice(0, 12)}… · auto-loads on scan open`,
    });
  }

  if (
    walletEntriesWithKeys >= 2 &&
    !defaultVouchProfileId &&
    tabNoticeCount === 0 &&
    !hasActiveKeys &&
    !pwaSessionMismatchTitle &&
    !walletNotInTab &&
    crossTabEntries.length === 0 &&
    orphanRemovedEntries.length === 0
  ) {
    rows.push({
      kind: "vouch_nudge",
      title: SET_DEFAULT_FOR_ATTESTATION,
      subtitle: savedObjectsAttestationNudge(walletEntriesWithKeys),
    });
  }

  if (walletScaleHintText && walletScaleTitle && savedCardCount > 0) {
    rows.push({
      kind: "wallet_scale",
      title: walletScaleTitle,
      subtitle: walletScaleHintText,
    });
  }

  const showEducation = !educationDismissed && rows.length === 0;

  return {
    rows,
    showEducation,
    visible: rows.length > 0 || showEducation,
  };
}

/** @returns {boolean} */
export function hubKeysCustodyPanelEnabledInDom() {
  return typeof document !== "undefined" && Boolean(document.getElementById("device-hub-keys-custody"));
}

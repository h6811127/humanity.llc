/**
 * Card workspace modes for /created/
 * @see docs/CARD_WORKSPACE_UX.md
 */

import { isWalletSaved, findWalletEntryByProfileId } from "./device-wallet.mjs";
import {
  firstSessionSetupRequired,
  ownershipBackupSeatbeltSatisfied,
} from "./created-first-session-gate-core.mjs";

export const SETUP_DONE_KEY = "hc_setup_done";

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {{
 *   profileId?: string | null,
 *   freshParam?: boolean,
 *   hasSigningKeys?: boolean,
 *   walletSaved?: boolean,
 *   setupDone?: boolean,
 *   seatbeltSatisfied?: boolean,
 * }} input
 * @returns {CreatedMode}
 */
export function resolveCreatedMode(input) {
  const {
    profileId = null,
    freshParam = false,
    hasSigningKeys = false,
    walletSaved = false,
    setupDone = false,
    seatbeltSatisfied = false,
  } = input;

  if (!profileId) return "view";
  if (!hasSigningKeys) return "view";

  if (
    firstSessionSetupRequired({
      freshParam,
      walletSaved,
      setupDone,
      seatbeltSatisfied,
    })
  ) {
    return "setup";
  }
  return "control";
}

/** @returns {Record<string, true>} */
function loadSetupDoneMap() {
  try {
    const raw = localStorage.getItem(SETUP_DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {string | null | undefined} profileId */
export function isSetupDone(profileId) {
  if (!profileId) return false;
  return !!loadSetupDoneMap()[profileId];
}

/** @param {string} profileId */
export function markSetupDone(profileId) {
  const map = loadSetupDoneMap();
  map[profileId] = true;
  localStorage.setItem(SETUP_DONE_KEY, JSON.stringify(map));
}

/** Backfill hc_setup_done when wallet row already has a recovery seatbelt (legacy). */
export function syncSetupDoneForSavedProfile(profileId, walletEntry = null) {
  if (!profileId || isSetupDone(profileId)) return;
  if (!isWalletSaved(profileId)) return;
  const entry = walletEntry ?? findWalletEntryByProfileId(profileId);
  if (ownershipBackupSeatbeltSatisfied(null, entry)) {
    markSetupDone(profileId);
  }
}

/**
 * @param {string | null | undefined} profileId
 * @param {boolean} freshParam
 * @param {() => Record<string, unknown> | null} getSession
 */
export function modeFromPage(profileId, freshParam, getSession) {
  const session = getSession();
  const walletEntry = profileId ? findWalletEntryByProfileId(profileId) : null;
  if (profileId && !freshParam) {
    syncSetupDoneForSavedProfile(profileId, walletEntry);
  }

  const hasSigningKeys = !!(
    session?.owner_private_key_b58 || session?.recovery_private_key_b58
  );
  const walletSaved = profileId ? isWalletSaved(profileId) : false;
  const seatbeltSatisfied = ownershipBackupSeatbeltSatisfied(session, walletEntry);
  return resolveCreatedMode({
    profileId,
    freshParam,
    hasSigningKeys,
    walletSaved,
    setupDone: profileId ? isSetupDone(profileId) : false,
    seatbeltSatisfied,
  });
}

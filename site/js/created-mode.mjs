/**
 * Card workspace modes for /created/
 * @see docs/CARD_WORKSPACE_UX.md
 */

import { isWalletSaved } from "./device-wallet.mjs";

export const SETUP_DONE_KEY = "hc_setup_done";

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * @param {{
 *   profileId?: string | null,
 *   freshParam?: boolean,
 *   hasSigningKeys?: boolean,
 *   walletSaved?: boolean,
 * }} input
 * @returns {CreatedMode}
 */
export function resolveCreatedMode(input) {
  const {
    profileId = null,
    freshParam = false,
    hasSigningKeys = false,
    walletSaved = false,
  } = input;

  if (!profileId) return "view";
  if (!hasSigningKeys) return "view";

  // Post-create wizard only while fresh or keys not yet on this device.
  // Returning stewards (hub Open controls / #revoke) skip setup even if hc_setup_done unset.
  if (freshParam || !walletSaved) return "setup";
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

/** Backfill hc_setup_done when the card is already saved on this device. */
export function syncSetupDoneForSavedProfile(profileId) {
  if (!profileId || isSetupDone(profileId)) return;
  if (isWalletSaved(profileId)) markSetupDone(profileId);
}

/**
 * @param {string | null | undefined} profileId
 * @param {boolean} freshParam
 * @param {() => Record<string, unknown> | null} getSession
 */
export function modeFromPage(profileId, freshParam, getSession) {
  if (profileId && !freshParam) syncSetupDoneForSavedProfile(profileId);

  const session = getSession();
  const hasSigningKeys = !!(
    session?.owner_private_key_b58 || session?.recovery_private_key_b58
  );
  const walletSaved = profileId ? isWalletSaved(profileId) : false;
  return resolveCreatedMode({
    profileId,
    freshParam,
    hasSigningKeys,
    walletSaved,
  });
}

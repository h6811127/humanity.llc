/**
 * First control visit containment rules for /created/ (presentation only).
 * @see docs/CARD_WORKSPACE_UX.md · docs/STEWARD_UX_PRESENTATION_TARGET.md
 */

export const CONTROL_VISITED_STORAGE_KEY_PREFIX = "hc_created_control_visited:";
export const FIRST_CONTROL_SESSION_KEY_PREFIX = "hc_created_first_control_active:";

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function hasControlVisited(profileId, storage) {
  if (!profileId || !storage) return true;
  return storage.getItem(`${CONTROL_VISITED_STORAGE_KEY_PREFIX}${profileId}`) === "1";
}

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function markControlVisited(profileId, storage) {
  if (!profileId || !storage) return;
  try {
    storage.setItem(`${CONTROL_VISITED_STORAGE_KEY_PREFIX}${profileId}`, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} sessionStorage
 */
export function isFirstControlSessionActive(profileId, sessionStorage) {
  if (!profileId || !sessionStorage) return false;
  return sessionStorage.getItem(`${FIRST_CONTROL_SESSION_KEY_PREFIX}${profileId}`) === "1";
}

/**
 * Mark first-ever control visit and flag this tab session for containment UI.
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} sessionStorage
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} localStorage
 * @returns {boolean} Whether first-session containment applies now
 */
export function beginFirstControlSession(profileId, sessionStorage, localStorage) {
  if (!profileId) return false;
  if (hasControlVisited(profileId, localStorage)) {
    return isFirstControlSessionActive(profileId, sessionStorage);
  }
  markControlVisited(profileId, localStorage);
  try {
    sessionStorage?.setItem(`${FIRST_CONTROL_SESSION_KEY_PREFIX}${profileId}`, "1");
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem"> | null | undefined} sessionStorage
 */
export function shouldHideRoomSwitcherForFirstSession(profileId, sessionStorage) {
  return isFirstControlSessionActive(profileId, sessionStorage);
}

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem"> | null | undefined} sessionStorage
 */
export function shouldHideSetupMemoryProtectChip(profileId, sessionStorage) {
  return isFirstControlSessionActive(profileId, sessionStorage);
}

/**
 * @param {string | null | undefined} profileId
 * @param {Pick<Storage, "getItem"> | null | undefined} sessionStorage
 */
export function shouldSuppressPilotScorecards(profileId, sessionStorage) {
  return isFirstControlSessionActive(profileId, sessionStorage);
}

/**
 * Step 20 slice 4 — honest beat when a deploy root gains a season operator key.
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Identity and rooms
 */

import {
  GAME_SEASON_MANIFESTO_PREFIX,
  walletEntryHasOrganizerIssuerKey,
} from "./create-organizer-season-core.mjs";
import { isGeneralRootCardSession } from "./created-child-object-core.mjs";
import { STEWARD_ROOM_SEASON } from "./steward-active-room-core.mjs";

export const SEASON_KEY_HONEST_BEAT_STORAGE_PREFIX = "hc_season_key_honest_beat_seen:";
export const SEASON_KEY_HONEST_BEAT_PENDING_PREFIX = "hc_season_key_honest_beat_pending:";

/**
 * @param {string} profileId
 */
export function seasonKeyHonestBeatStorageKey(profileId) {
  return `${SEASON_KEY_HONEST_BEAT_STORAGE_PREFIX}${String(profileId || "").trim()}`;
}

/**
 * @param {string} profileId
 * @param {Pick<Storage, "getItem" | "setItem">} storage
 */
export function readSeasonKeyHonestBeatDismissed(profileId, storage) {
  const id = String(profileId || "").trim();
  if (!id) return false;
  try {
    return storage.getItem(seasonKeyHonestBeatStorageKey(id)) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} profileId
 * @param {Pick<Storage, "setItem">} storage
 */
export function writeSeasonKeyHonestBeatDismissed(profileId, storage) {
  const id = String(profileId || "").trim();
  if (!id) return;
  try {
    storage.setItem(seasonKeyHonestBeatStorageKey(id), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Deploy-style general root that now has a game-operator / issuer key (dual skin).
 *
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Record<string, unknown> | null | undefined} [walletEntry]
 * @param {{ dismissed?: boolean }} [extras]
 */
export function shouldShowSeasonKeyHonestBeat(session, walletEntry, extras = {}) {
  if (extras.dismissed) return false;
  if (!isGeneralRootCardSession(session)) return false;
  const view =
    walletEntry && typeof walletEntry === "object"
      ? { ...(session && typeof session === "object" ? session : {}), ...walletEntry }
      : session;
  if (!walletEntryHasOrganizerIssuerKey(view)) return false;
  const manifesto =
    typeof view?.manifesto_line === "string" ? view.manifesto_line.trim() : "";
  if (manifesto.startsWith(GAME_SEASON_MANIFESTO_PREFIX)) return false;
  return true;
}

export function seasonKeyHonestBeatTitle() {
  return "This account now has a season operator key";
}

export function seasonKeyHonestBeatBody() {
  return "Live defaults to Season for new scan points. Your door plates are still here.";
}

/**
 * @param {string} profileId
 */
export function markSeasonKeyHonestBeatPending(profileId) {
  const id = String(profileId || "").trim();
  if (!id || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(`${SEASON_KEY_HONEST_BEAT_PENDING_PREFIX}${id}`, "1");
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} profileId
 * @param {Pick<Storage, "getItem" | "removeItem">} storage
 */
export function consumeSeasonKeyHonestBeatPending(profileId, storage) {
  const id = String(profileId || "").trim();
  if (!id) return false;
  const key = `${SEASON_KEY_HONEST_BEAT_PENDING_PREFIX}${id}`;
  try {
    const pending = storage.getItem(key) === "1";
    if (pending) storage.removeItem(key);
    return pending;
  } catch {
    return false;
  }
}

export const SEASON_KEY_HONEST_BEAT_DEFAULT_ROOM = STEWARD_ROOM_SEASON;

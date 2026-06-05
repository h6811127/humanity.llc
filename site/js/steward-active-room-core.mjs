import {
  GAME_SEASON_SETUP_FOCUS,
  isGameSeasonCustodySession,
} from "./create-organizer-season-core.mjs";
import { isGeneralRootCardSession } from "./created-child-object-core.mjs";
import { WEAR_PRINT_FOCUS } from "./create-wear-wizard-core.mjs";

/** @typedef {"doors" | "wear" | "season"} StewardActiveRoom */

export const STEWARD_ROOM_DOORS = "doors";
export const STEWARD_ROOM_WEAR = "wear";
export const STEWARD_ROOM_SEASON = "season";

export const STEWARD_ACTIVE_ROOM_OPTIONS = [
  STEWARD_ROOM_DOORS,
  STEWARD_ROOM_WEAR,
  STEWARD_ROOM_SEASON,
];

export const STEWARD_ROOM_STORAGE_PREFIX = "hc_steward_active_room:";

export const STEWARD_ROOM_CHANGED_EVENT = "hc-steward-room-changed";

/** @type {{ profileId: string; room: StewardActiveRoom | null }} */
let boundRuntime = { profileId: "", room: null };

/**
 * @param {string} profileId
 */
export function stewardActiveRoomStorageKey(profileId) {
  return `${STEWARD_ROOM_STORAGE_PREFIX}${String(profileId || "").trim()}`;
}

/**
 * @param {unknown} room
 * @returns {room is StewardActiveRoom}
 */
export function isValidStewardActiveRoom(room) {
  return (
    room === STEWARD_ROOM_DOORS || room === STEWARD_ROOM_WEAR || room === STEWARD_ROOM_SEASON
  );
}

/**
 * @param {string} room
 */
export function stewardActiveRoomLabel(room) {
  if (room === STEWARD_ROOM_WEAR) return "Wear";
  if (room === STEWARD_ROOM_SEASON) return "Season";
  return "Doors";
}

/**
 * @param {string} profileId
 * @param {Storage} [storage]
 */
export function readPersistedStewardActiveRoom(profileId, storage) {
  const id = String(profileId || "").trim();
  if (!id) return null;
  const store =
    storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  if (!store) return null;
  try {
    const value = store.getItem(stewardActiveRoomStorageKey(id));
    return isValidStewardActiveRoom(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} profileId
 * @param {StewardActiveRoom} room
 * @param {Storage} [storage]
 */
export function writePersistedStewardActiveRoom(profileId, room, storage) {
  const id = String(profileId || "").trim();
  if (!id || !isValidStewardActiveRoom(room)) return;
  const store =
    storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  if (!store) return;
  try {
    store.setItem(stewardActiveRoomStorageKey(id), room);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} profileId
 * @param {StewardActiveRoom} room
 */
export function bindStewardActiveRoomRuntime(profileId, room) {
  boundRuntime = {
    profileId: String(profileId || "").trim(),
    room: isValidStewardActiveRoom(room) ? room : null,
  };
}

/**
 * @param {string} [profileId]
 * @returns {StewardActiveRoom | null}
 */
export function getBoundStewardActiveRoom(profileId) {
  const id = String(profileId || "").trim();
  if (!id) return boundRuntime.room;
  if (boundRuntime.profileId === id && boundRuntime.room) return boundRuntime.room;
  return readPersistedStewardActiveRoom(id);
}

/**
 * @param {string} [profileId]
 * @param {{ activeRoom?: StewardActiveRoom | null; walletEntry?: Record<string, unknown> | null }} [overrides]
 */
export function stewardPresentationExtras(profileId, overrides = {}) {
  const id = String(profileId || "").trim();
  if (isValidStewardActiveRoom(overrides.activeRoom)) {
    return { ...overrides, activeRoom: overrides.activeRoom };
  }
  const bound = id ? getBoundStewardActiveRoom(id) : null;
  if (bound) {
    return { ...overrides, activeRoom: bound };
  }
  const persisted = id ? readPersistedStewardActiveRoom(id) : null;
  if (persisted) {
    return { ...overrides, activeRoom: persisted };
  }
  return { ...overrides };
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function shouldShowStewardRoomSwitcher(session) {
  return isGeneralRootCardSession(session);
}

/**
 * @param {{
 *   profileId?: string;
 *   searchParams?: URLSearchParams;
 *   hash?: string;
 *   session?: Record<string, unknown> | null;
 *   walletEntry?: Record<string, unknown> | null;
 *   storage?: Storage;
 * }} input
 * @returns {StewardActiveRoom}
 */
export function resolveInitialStewardActiveRoom(input = {}) {
  const params = input.searchParams ?? new URLSearchParams();
  const hashKey = String(input.hash ?? "").replace(/^#/, "");
  const focus = params.get("focus") || (hashKey && !hashKey.includes("=") ? hashKey : "");

  if (focus === GAME_SEASON_SETUP_FOCUS || focus === "game") {
    return STEWARD_ROOM_SEASON;
  }
  if (focus === WEAR_PRINT_FOCUS) {
    return STEWARD_ROOM_WEAR;
  }

  const roomParam = params.get("room");
  if (isValidStewardActiveRoom(roomParam)) {
    return roomParam;
  }

  const profileId = String(input.profileId || "").trim();
  const persisted = profileId ? readPersistedStewardActiveRoom(profileId, input.storage) : null;
  if (persisted) return persisted;

  const session = input.session;
  const walletEntry = input.walletEntry;
  const view =
    walletEntry && typeof walletEntry === "object"
      ? { ...(session && typeof session === "object" ? session : {}), ...walletEntry }
      : session;
  if (isGameSeasonCustodySession(view)) {
    return STEWARD_ROOM_SEASON;
  }

  return STEWARD_ROOM_DOORS;
}

/**
 * Cross-room hint when active skin hides other scan point types.
 * @param {StewardActiveRoom} activeRoom
 * @param {Record<string, unknown> | null | undefined} session
 */
export function stewardRoomCrosshint(activeRoom, session) {
  if (activeRoom === STEWARD_ROOM_SEASON) {
    return {
      body: "Door plates and return tags are managed under Doors.",
      switchRoom: STEWARD_ROOM_DOORS,
      switchLabel: "Switch to Doors",
    };
  }
  if (activeRoom === STEWARD_ROOM_DOORS && isGameSeasonCustodySession(session)) {
    return {
      body: "Game season scan points are managed under Season.",
      switchRoom: STEWARD_ROOM_SEASON,
      switchLabel: "Switch to Season",
    };
  }
  if (activeRoom === STEWARD_ROOM_WEAR) {
    return {
      body: "Print your own garment QR here. Door scan points stay under Doors.",
      switchRoom: STEWARD_ROOM_DOORS,
      switchLabel: "Switch to Doors",
    };
  }
  return null;
}

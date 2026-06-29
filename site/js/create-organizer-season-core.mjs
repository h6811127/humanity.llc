/**
 * Organizer season create flow (PRODUCT_POSITIONING step 14).
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 14
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E
 */

import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import { parseGameNodeSeasonId } from "./created-child-object-game-node-core.mjs";

export const GAME_SEASON_SETUP_FOCUS = "game-season-setup";
export const GAME_SEASON_ID_SESSION_PREFIX = "hc_game_season_id:";
export const GAME_SEASON_SETUP_FLOW_KEY = "hc_game_season_setup_flow";

export const GAME_SEASON_MANIFESTO_PREFIX = "City game season";

/**
 * @param {URLSearchParams} searchParams
 */
export function isGameSeasonCreateIntent(searchParams) {
  return searchParams.get("intent") === "game";
}

/**
 * @param {URLSearchParams | string} search
 * @param {string} [hash]
 */
export function isGameSeasonSetupFocus(search, hash = "") {
  const params =
    search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ""));
  const focus = params.get("focus");
  if (focus === GAME_SEASON_SETUP_FOCUS || focus === "game") return true;
  return String(hash || "").replace(/^#/, "") === GAME_SEASON_SETUP_FOCUS;
}

/**
 * @param {string} handle
 * @param {string} seasonId
 */
export function gameSeasonRootManifesto(handle, seasonId) {
  const normalizedHandle = String(handle || "").trim().replace(/^@/, "");
  const id = String(seasonId || "").trim();
  if (id && normalizedHandle) return `City game season · ${id} · @${normalizedHandle}`;
  if (id) return `City game season · ${id}`;
  if (normalizedHandle) return `City game season · @${normalizedHandle}`;
  return "City game season";
}

/**
 * @param {unknown} raw
 */
export function parseGameSeasonIdField(raw) {
  return parseGameNodeSeasonId(raw);
}

/**
 * @param {string} profileId
 * @param {string} seasonId
 */
export function rememberGameSeasonIdForProfile(profileId, seasonId) {
  if (!profileId || !seasonId) return;
  try {
    sessionStorage.setItem(`${GAME_SEASON_ID_SESSION_PREFIX}${profileId}`, seasonId);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} profileId
 */
export function clearRememberedGameSeasonIdForProfile(profileId) {
  if (!profileId) return;
  try {
    sessionStorage.removeItem(`${GAME_SEASON_ID_SESSION_PREFIX}${profileId}`);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} profileId
 */
export function readRememberedGameSeasonId(profileId) {
  if (!profileId) return "";
  try {
    return sessionStorage.getItem(`${GAME_SEASON_ID_SESSION_PREFIX}${profileId}`)?.trim() || "";
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryHasOrganizerIssuerKey(entry) {
  const issuer =
    typeof entry?.issuer_public_key === "string" ? entry.issuer_public_key.trim() : "";
  const organizerPub =
    typeof entry?.organizer_public_key_b58 === "string"
      ? entry.organizer_public_key_b58.trim()
      : "";
  return issuer.length > 0 || organizerPub.length > 0;
}

/**
 * Saved general root with organizer / game-operator key (season root).
 * @param {unknown[]} walletEntries
 */
export function pickPreferredGameSeasonRoot(walletEntries) {
  return (
    listGeneralRootsWithKeys(walletEntries).find((entry) =>
      walletEntryHasOrganizerIssuerKey(entry)
    ) ?? null
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 */
export function isGameSeasonCustodySession(session) {
  if (!session || typeof session !== "object") return false;
  const manifesto =
    typeof session.manifesto_line === "string" ? session.manifesto_line.trim() : "";
  // Season roots use the City game manifesto. Optional coalition revoke keys on
  // deploy-style general accounts are not season custody.
  return manifesto.startsWith(GAME_SEASON_MANIFESTO_PREFIX);
}

export function markGameSeasonSetupFlow() {
  try {
    sessionStorage.setItem(GAME_SEASON_SETUP_FLOW_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isGameSeasonSetupFlowActive() {
  try {
    return sessionStorage.getItem(GAME_SEASON_SETUP_FLOW_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearGameSeasonSetupFlow() {
  try {
    sessionStorage.removeItem(GAME_SEASON_SETUP_FLOW_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Face ID / device_unlock is incompatible with game season setup (organizer key custody).
 * @param {{
 *   session?: Record<string, unknown> | null,
 *   gameSeasonCreateIntent?: boolean,
 *   setupFlowActive?: boolean,
 * }} input
 */
export function gameSeasonBlocksDeviceUnlock(input = {}) {
  if (input.gameSeasonCreateIntent === true) return true;
  if (input.setupFlowActive === true) return true;
  return isGameSeasonCustodySession(input.session);
}

/**
 * @param {Record<string, unknown>} entry
 */
function walletEntryQrId(entry) {
  const direct = typeof entry.qr_id === "string" ? entry.qr_id.trim() : "";
  if (direct) return direct;
  const scanUrl = typeof entry.scan_url === "string" ? entry.scan_url.trim() : "";
  if (!scanUrl) return "";
  try {
    const url = new URL(scanUrl, "https://humanity.llc");
    return url.searchParams.get("q")?.trim() || "";
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, unknown>} entry
 * @param {string} [origin]
 * @param {{ fresh?: boolean }} [opts]
 */
export function createdGameSeasonSetupHref(entry, origin = "https://humanity.llc", opts = {}) {
  if (!entry?.profile_id) return null;
  const url = new URL("/created/", origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  const qrId = walletEntryQrId(entry);
  if (qrId) url.searchParams.set("qr_id", qrId);
  if (opts.fresh) url.searchParams.set("fresh", "1");
  url.searchParams.set("focus", GAME_SEASON_SETUP_FOCUS);
  return `${url.pathname}${url.search}`;
}


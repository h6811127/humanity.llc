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

/** @typedef {"standard" | "redirect_live" | "create_season_root"} GameSeasonSubmitStrategy */

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
export function readRememberedGameSeasonId(profileId) {
  if (!profileId) return "";
  try {
    return sessionStorage.getItem(`${GAME_SEASON_ID_SESSION_PREFIX}${profileId}`)?.trim() || "";
  } catch {
    return "";
  }
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

/**
 * @param {{
 *   searchParams: URLSearchParams;
 *   walletEntries: unknown[];
 * }} ctx
 * @returns {GameSeasonSubmitStrategy}
 */
export function resolveGameSeasonSubmitStrategy(ctx) {
  if (!isGameSeasonCreateIntent(ctx.searchParams)) return "standard";
  const root = pickPreferredGeneralRoot(listGeneralRootsWithKeys(ctx.walletEntries));
  if (root) return "redirect_live";
  return "create_season_root";
}

/**
 * @param {GameSeasonSubmitStrategy} strategy
 */
export function gameSeasonSubmitButtonLabel(strategy) {
  if (strategy === "redirect_live") return "Continue season setup on Live";
  if (strategy === "create_season_root") return "Create season root & continue";
  return null;
}

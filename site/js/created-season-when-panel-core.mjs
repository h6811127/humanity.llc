/**
 * Season When panel — season id canonical home on /created/ (Step 20 slice 6 · Q3).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Season cockpit · When
 */

import { readSeasonPublishDraft } from "./city-game-rules-publish-core.mjs";
import { parseGameNodeSeasonId } from "./created-child-object-game-node-core.mjs";
import {
  readRememberedGameSeasonId,
  rememberGameSeasonIdForProfile,
} from "./create-organizer-season-core.mjs";

export const SEASON_WHEN_PANEL_ID = "created-season-when-panel";
export const SEASON_WHEN_ID_INPUT_ID = "child-object-season-when-id";

export const SEASON_WHEN_RULES_HINT_ID = "child-object-season-when-rules-hint";

/**
 * @param {string} profileId
 * @param {string} raw
 */
export function persistSeasonWhenId(profileId, raw) {
  const seasonId = parseGameNodeSeasonId(raw);
  rememberGameSeasonIdForProfile(profileId, seasonId);
  return seasonId;
}

/**
 * @param {string} profileId
 */
export function readSeasonWhenId(profileId) {
  return readRememberedGameSeasonId(profileId);
}

/**
 * @param {Storage} storage
 * @param {string} profileId
 * @param {string} seasonId
 */
export function summarizeSeasonPublishDraftForWhenPanel(storage, profileId, seasonId) {
  if (!profileId || !seasonId) return null;
  const draft = readSeasonPublishDraft(storage, profileId, seasonId);
  if (!draft || typeof draft !== "object") return null;

  const status = typeof draft.status === "string" ? draft.status.trim() : "";
  const window =
    draft.window && typeof draft.window === "object"
      ? /** @type {{ starts_at?: string; ends_at?: string }} */ (draft.window)
      : null;
  const starts = window?.starts_at ? formatWhenPanelDate(window.starts_at) : "";
  const ends = window?.ends_at ? formatWhenPanelDate(window.ends_at) : "";
  const edgeCount = Array.isArray(draft.unlock_edges) ? draft.unlock_edges.length : 0;

  const parts = [];
  if (status) parts.push(`Status: ${status}`);
  if (starts && ends) parts.push(`Window: ${starts} → ${ends}`);
  else if (starts) parts.push(`Starts: ${starts}`);
  if (edgeCount) parts.push(`${edgeCount} unlock edge${edgeCount === 1 ? "" : "s"} in draft`);

  if (!parts.length) return null;
  return `${parts.join(" · ")} — open Rules page & launch below to preview or download HTML.`;
}

/**
 * @param {string} iso
 */
function formatWhenPanelDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

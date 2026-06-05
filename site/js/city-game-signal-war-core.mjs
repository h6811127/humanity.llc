/**
 * Signal War client helpers — device-local faction pledge (**SW-02**).
 * No server rows; optional UX hint only.
 */

export const SIGNAL_WAR_PLEDGE_STORAGE_KEY = "hc_city_game_faction_pledge_v1";

/**
 * @param {string} seasonId
 * @param {string} faction
 */
export function buildFactionPledgeRecord(seasonId, faction) {
  return {
    season_id: String(seasonId).trim(),
    faction: String(faction).trim().toLowerCase(),
    saved_at: new Date().toISOString(),
  };
}

/**
 * @param {unknown} raw
 */
export function parseFactionPledgeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (raw);
  const seasonId = typeof row.season_id === "string" ? row.season_id.trim() : "";
  const faction = typeof row.faction === "string" ? row.faction.trim().toLowerCase() : "";
  if (!seasonId || !["red", "blue", "green", "yellow"].includes(faction)) return null;
  return { season_id: seasonId, faction, saved_at: String(row.saved_at ?? "") };
}

/**
 * @param {Record<string, unknown> | null} record
 */
export function serializeFactionPledgeRecord(record) {
  if (!record) return "";
  return JSON.stringify(record);
}

/**
 * @param {string | null} raw
 * @param {string} seasonId
 */
export function readFactionPledgeForSeason(raw, seasonId) {
  if (!raw?.trim()) return null;
  try {
    const parsed = parseFactionPledgeRecord(JSON.parse(raw));
    if (!parsed || parsed.season_id !== seasonId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} season
 */
export function resolveSignalWarGuideSteps(season) {
  const block =
    season.signal_war && typeof season.signal_war === "object"
      ? /** @type {Record<string, unknown>} */ (season.signal_war)
      : null;
  const guide =
    block?.player_guide && typeof block.player_guide === "object"
      ? /** @type {{ title?: string; body?: string }[]} */ (block.player_guide)
      : [];
  if (Array.isArray(guide) && guide.length) {
    return guide
      .map((row) => ({
        title: String(row.title ?? "").trim(),
        body: String(row.body ?? "").trim(),
      }))
      .filter((row) => row.title && row.body);
  }
  return [
    {
      title: "Signal War. Faction contest",
      body: "Four teams fight for relay holds on the public board. Sanctuaries are treaty zones. Pledge a faction there, no capture grinding.",
    },
    {
      title: "Operator-paced relays at open",
      body: "At season open, relay holds flip from operator bulletins. Not your personal scan count. Player capture opens mid-season when the season config enables it.",
    },
  ];
}

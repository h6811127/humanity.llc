/**
 * Pick ?season_id= for GET /steward/entitlements when this tab owns a season root card.
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md
 */

/**
 * @param {{ seasons?: Array<{ season_id?: string, season_root_profile_id?: string | null }> }} index
 * @param {string | null | undefined} profileId Active card profile_id from hc_created
 * @returns {string | null} season_id query value, or null to omit (server auto-picks single link)
 */
export function seasonIdForStewardEntitlementsQuery(index, profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return null;

  const rows = Array.isArray(index?.seasons) ? index.seasons : [];
  const matches = rows.filter((row) => {
    const root = row?.season_root_profile_id?.trim();
    return root && root === pid && typeof row.season_id === "string" && row.season_id.trim();
  });

  if (matches.length !== 1) return null;
  return matches[0].season_id.trim();
}

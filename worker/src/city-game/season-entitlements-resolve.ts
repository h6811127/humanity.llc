import { profileLinkedAccount, resolveEffectiveEntitlements } from "../steward/db";
import type { CrSeasonConfig } from "./season-config";
import {
  gameSeasonLimitsFromEntitlements,
  REFERENCE_FREE_GAME_ENTITLEMENTS,
  type GameSeasonLimits,
} from "./season-entitlements";

export async function resolveGameSeasonLimits(
  db: D1Database,
  season: CrSeasonConfig
): Promise<GameSeasonLimits> {
  const rootProfileId = season.season_root_profile_id?.trim();
  if (!rootProfileId) {
    return gameSeasonLimitsFromEntitlements(REFERENCE_FREE_GAME_ENTITLEMENTS);
  }

  const accountId = await profileLinkedAccount(db, rootProfileId);
  if (!accountId) {
    return gameSeasonLimitsFromEntitlements(REFERENCE_FREE_GAME_ENTITLEMENTS);
  }

  const resolved = await resolveEffectiveEntitlements(db, accountId);
  if (!resolved) {
    return gameSeasonLimitsFromEntitlements(REFERENCE_FREE_GAME_ENTITLEMENTS);
  }

  return gameSeasonLimitsFromEntitlements(resolved.entitlements);
}

import type { CrSeasonConfig } from "./season-config";
import { BUNDLED_SEASON_CONFIGS } from "./season-registry.generated";

const registryById = new Map<string, CrSeasonConfig>();
const registryByRootProfile = new Map<string, CrSeasonConfig>();

function registerSeason(season: CrSeasonConfig): void {
  registryById.set(season.season_id, season);
  const root = season.season_root_profile_id?.trim();
  if (root) {
    registryByRootProfile.set(root, season);
  }
}

for (const season of BUNDLED_SEASON_CONFIGS) {
  registerSeason(season);
}

/** Default bundled season — Cedar Rapids pilot unless registry order changes. */
export function defaultSeason(): CrSeasonConfig {
  const pilot = registryById.get("cr_season_01_wake");
  if (pilot) return pilot;
  const first = BUNDLED_SEASON_CONFIGS[0];
  if (!first) {
    throw new Error("No city game seasons registered in this worker build.");
  }
  return first;
}

/** All seasons registered in this worker build (bundled JSON today; self-serve loader later). */
export function registeredSeasons(): readonly CrSeasonConfig[] {
  return [...registryById.values()];
}

export function registeredSeasonIds(): string[] {
  return [...registryById.keys()].sort();
}

/** Resolve season config by public season id (snapshot API, game_node documents). */
export function resolveSeasonById(seasonId: string): CrSeasonConfig | null {
  const trimmed = seasonId.trim();
  if (!trimmed) return null;
  return registryById.get(trimmed) ?? null;
}

/** Resolve season by season root card profile_id (scan resolver on `/c/{profile}?q=`). */
export function resolveSeasonByRootProfile(profileId: string): CrSeasonConfig | null {
  const trimmed = profileId.trim();
  if (!trimmed) return null;
  return registryByRootProfile.get(trimmed) ?? null;
}

/**
 * Season config for scan/contribute on a card profile (season root).
 * Unbound pilot seasons (`season_root_profile_id` null) fall back to the bundled default.
 */
export function resolveSeasonForProfile(profileId: string): CrSeasonConfig | null {
  const byRoot = resolveSeasonByRootProfile(profileId);
  if (byRoot) return byRoot;
  const pilot = defaultSeason();
  const root = pilot.season_root_profile_id?.trim();
  if (!root) return pilot;
  return null;
}

/** Whether drift repair and game window apply on scans for this profile + season. */
export function isSeasonRootProfile(profileId: string, season: CrSeasonConfig): boolean {
  const root = season.season_root_profile_id?.trim();
  if (!root) return true;
  return root === profileId.trim();
}

/**
 * Register an additional season config (tests + future self-serve loader).
 * Later seasons must not reuse season_id or season_root_profile_id.
 */
export function registerSeasonConfig(season: CrSeasonConfig): void {
  const existing = registryById.get(season.season_id);
  if (existing && existing !== season) {
    throw new Error(`Season id already registered: ${season.season_id}`);
  }
  const root = season.season_root_profile_id?.trim();
  if (root) {
    const byRoot = registryByRootProfile.get(root);
    if (byRoot && byRoot.season_id !== season.season_id) {
      throw new Error(`season_root_profile_id already bound to ${byRoot.season_id}`);
    }
  }
  registerSeason(season);
}

/** Test hook — restore bundled registry only. */
export function resetSeasonRegistryForTests(): void {
  registryById.clear();
  registryByRootProfile.clear();
  for (const season of BUNDLED_SEASON_CONFIGS) {
    registerSeason(season);
  }
}

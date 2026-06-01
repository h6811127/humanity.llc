/** Cedar Rapids city game — protocol constants (Phase A). */

export const GAME_NODE_OBJECT_TYPE = "game_node";

export const GAME_NODE_ROLES = [
  "relay_gate",
  "lore_archive",
  "sanctuary",
  "temp_drop",
  "witness",
  "route_splitter",
  "finale",
  "care_loop",
  "mobile_lore",
] as const;

export type GameNodeRole = (typeof GAME_NODE_ROLES)[number];

export const GAME_SEASON_ID_RE = /^[a-z][a-z0-9_-]{0,47}$/;

export const GAME_DISTRICTS = [
  "newbo",
  "czech_village",
  "greene_square",
  "river_spine",
  "downtown",
] as const;

export function isCityGameEnabled(env: { CITY_GAME_ENABLED?: string }): boolean {
  return env.CITY_GAME_ENABLED === "1";
}

export function isGameNodeRole(value: string): value is GameNodeRole {
  return (GAME_NODE_ROLES as readonly string[]).includes(value);
}

import { CR_SEASON_01 } from "../src/city-game/season-config";

/** Season root profile for bundled CR season — use on game-update/contribute routes. */
export const CITY_GAME_SEASON_ROOT_PROFILE =
  CR_SEASON_01.season_root_profile_id?.trim() ?? "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

/** Mid-window instant for cr_season_01_wake (2026-06-06 … 2026-06-08 America/Chicago). */
export const CITY_GAME_SEASON_OPEN_NOW = new Date("2026-06-07T00:00:00-05:00");

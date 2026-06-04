/**
 * E4 — production CITY_GAME_ENABLED flag in worker/wrangler.toml.
 * @see docs/CITY_GAME_LAUNCH_CHECKLIST.md
 */

/**
 * @param {string} [wranglerToml]
 */
export function assessWranglerCityGameEnabled(wranglerToml = "") {
  const toml = String(wranglerToml);
  const present = /CITY_GAME_ENABLED/.test(toml);
  const enabled =
    /CITY_GAME_ENABLED\s*=\s*["']?1["']?/.test(toml) ||
    /CITY_GAME_ENABLED\s*=\s*1\b/.test(toml);

  return {
    present,
    enabled,
    hint: enabled
      ? "CITY_GAME_ENABLED=1 in wrangler.toml — deploy worker on launch day after C5 sign-off."
      : "Launch day only: set CITY_GAME_ENABLED=1 in worker/wrangler.toml, then worker:deploy (not via launch-surfaces).",
  };
}

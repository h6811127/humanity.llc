/**
 * Focus routing for /created/?focus=game-season-setup (step 14).
 */

import { GAME_SEASON_SETUP_FOCUS, markGameSeasonSetupFlow } from "./create-organizer-season-core.mjs";
import { CREATED_PANEL_FOCUS } from "./created-tabs.mjs";

/**
 * @param {(tabId: string) => void} select
 * @param {URLSearchParams} [searchParams]
 * @param {string} [hash]
 */
export function applyGameSeasonSetupFocus(select, searchParams, hash = location.hash) {
  const params = searchParams ?? new URLSearchParams(location.search);
  const focusParam = params.get("focus");
  const hashKey = String(hash || "").replace(/^#/, "");
  const focusKey =
    focusParam === GAME_SEASON_SETUP_FOCUS || focusParam === "game"
      ? GAME_SEASON_SETUP_FOCUS
      : hashKey === GAME_SEASON_SETUP_FOCUS
        ? GAME_SEASON_SETUP_FOCUS
        : null;
  if (!focusKey || !CREATED_PANEL_FOCUS[focusKey]) return false;

  markGameSeasonSetupFlow();
  select("now");
  requestAnimationFrame(() => {
    const panelId = CREATED_PANEL_FOCUS[focusKey];
    const hub = document.getElementById("child-object-add-hub");
    if (hub instanceof HTMLDetailsElement) {
      hub.hidden = false;
      hub.open = true;
    }
    const gameSection = document.getElementById("child-object-add-game-node");
    if (gameSection) gameSection.hidden = false;
    const el = document.getElementById(panelId) || gameSection;
    if (!el) return;
    if (el.tagName === "DETAILS") {
      el.hidden = false;
      el.open = true;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const url = new URL(location.href);
  if (url.searchParams.has("focus")) {
    url.searchParams.delete("focus");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return true;
}

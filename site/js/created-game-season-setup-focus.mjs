/**
 * Focus routing for /created/?focus=game-season-setup&room=season (step 14).
 */

import { GAME_SEASON_SETUP_FOCUS, markGameSeasonSetupFlow } from "./create-organizer-season-core.mjs";
import { CREATED_PANEL_FOCUS } from "./created-tabs.mjs";

const STEWARD_ROOM_SEASON = "season";

export const GAME_SEASON_SETUP_HERO_TITLE = "Set up your live season";
export const GAME_SEASON_SETUP_HERO_LEAD =
  "Register checkpoints, publish rules, and add season scan points on this account.";

export const GAME_SEASON_SETUP_SCROLL_TARGET_ID = "child-object-game-node-setup";

/**
 * Season setup landing — distinct from generic control hero.
 */
export function applyGameSeasonSetupHeroCopy() {
  const heroTitle = document.querySelector(".created-hero-title");
  if (heroTitle) heroTitle.textContent = GAME_SEASON_SETUP_HERO_TITLE;
  const heroMeta = document.getElementById("created-hero-meta");
  if (heroMeta) heroMeta.textContent = GAME_SEASON_SETUP_HERO_LEAD;
}

/**
 * @param {(tabId: string) => void} select
 * @param {URLSearchParams} [searchParams]
 * @param {{ hash?: string; applyRoom?: (room: string) => void; refreshPresentation?: () => void }} [opts]
 */
export function applyGameSeasonSetupFocus(select, searchParams, opts = {}) {
  const params = searchParams ?? new URLSearchParams(location.search);
  const hash = opts.hash ?? location.hash;
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
  opts.applyRoom?.(STEWARD_ROOM_SEASON);
  opts.refreshPresentation?.();
  applyGameSeasonSetupHeroCopy();
  select("now");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const hub = document.getElementById("child-object-add-hub");
      if (hub instanceof HTMLDetailsElement) {
        hub.hidden = false;
        hub.open = true;
      }
      const gameSection = document.getElementById("child-object-add-game-node");
      if (gameSection) gameSection.hidden = false;

      const setupDetails = document.getElementById(GAME_SEASON_SETUP_SCROLL_TARGET_ID);
      const scrollTarget =
        setupDetails ||
        gameSection ||
        document.getElementById(CREATED_PANEL_FOCUS[focusKey]);
      if (!scrollTarget) return;

      if (scrollTarget.tagName === "DETAILS") {
        scrollTarget.hidden = false;
        scrollTarget.open = true;
      }
      scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const url = new URL(location.href);
  let changed = false;
  if (url.searchParams.has("focus")) {
    url.searchParams.delete("focus");
    changed = true;
  }
  if (url.searchParams.has("room")) {
    url.searchParams.delete("room");
    changed = true;
  }
  if (changed) {
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (typeof opts.refreshPresentation === "function") {
    window.setTimeout(() => {
      opts.refreshPresentation();
      const setupDetails = document.getElementById(GAME_SEASON_SETUP_SCROLL_TARGET_ID);
      if (setupDetails instanceof HTMLDetailsElement) {
        setupDetails.hidden = false;
        setupDetails.open = true;
        setupDetails.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 800);
  }

  return true;
}

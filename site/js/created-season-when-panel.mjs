/**
 * Season When panel UI — season id on Live, not /create/.
 */

import {
  persistSeasonWhenId,
  readSeasonWhenId,
  SEASON_WHEN_ID_INPUT_ID,
  SEASON_WHEN_PANEL_ID,
} from "./created-season-when-panel-core.mjs";
import { shouldShowSeasonProgressiveChecklist } from "./created-season-progressive-checklist-core.mjs";

export { SEASON_WHEN_PANEL_ID, SEASON_WHEN_ID_INPUT_ID };

/**
 * @param {{
 *   profileId: string;
 *   session: Record<string, unknown> | null | undefined;
 *   activeRoom?: string | null;
 *   getActiveRoom?: () => string | null | undefined;
 *   onSeasonIdSaved?: (seasonId: string) => void;
 * }} ctx
 */
export function initCreatedSeasonWhenPanel(ctx) {
  const panel = document.getElementById(SEASON_WHEN_PANEL_ID);
  const input = document.getElementById(SEASON_WHEN_ID_INPUT_ID);
  const status = document.getElementById("child-object-season-when-status");
  if (!(panel instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return null;

  function syncVisibility() {
    const activeRoom = ctx.getActiveRoom?.() ?? ctx.activeRoom ?? null;
    const show = shouldShowSeasonProgressiveChecklist({
      profileId: ctx.profileId,
      activeRoom,
    });
    panel.hidden = !show;
    panel.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function syncValue() {
    const remembered = readSeasonWhenId(ctx.profileId);
    if (remembered && !input.value.trim()) {
      input.value = remembered;
    }
  }

  function saveSeasonId() {
    const raw = input.value.trim();
    if (!raw) return;
    try {
      const seasonId = persistSeasonWhenId(ctx.profileId, raw);
      if (status instanceof HTMLElement) {
        status.hidden = false;
        status.textContent = `Season id saved: ${seasonId}`;
      }
      ctx.onSeasonIdSaved?.(seasonId);
    } catch (err) {
      if (status instanceof HTMLElement) {
        status.hidden = false;
        status.textContent =
          err instanceof Error ? err.message : "Use lowercase letters, numbers, underscores.";
      }
    }
  }

  if (input.dataset.wired !== "1") {
    input.dataset.wired = "1";
    input.addEventListener("change", saveSeasonId);
    input.addEventListener("blur", saveSeasonId);
  }

  syncVisibility();
  syncValue();

  return {
    refresh: () => {
      syncVisibility();
      syncValue();
    },
  };
}

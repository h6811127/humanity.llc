/**
 * Season When panel UI — season id on Live, not /create/.
 */

import {
  persistSeasonWhenId,
  readSeasonWhenId,
  SEASON_WHEN_ID_INPUT_ID,
  SEASON_WHEN_PANEL_ID,
  SEASON_WHEN_RULES_HINT_ID,
  summarizeSeasonPublishDraftForWhenPanel,
} from "./created-season-when-panel-core.mjs";
import { shouldShowSeasonProgressiveChecklist } from "./created-season-progressive-checklist-core.mjs";

export { SEASON_WHEN_PANEL_ID, SEASON_WHEN_ID_INPUT_ID } from "./created-season-when-panel-core.mjs";

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
  const rulesHint = document.getElementById(SEASON_WHEN_RULES_HINT_ID);
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

  function syncRulesHint() {
    if (!(rulesHint instanceof HTMLElement)) return;
    const seasonId = readSeasonWhenId(ctx.profileId) || input.value.trim();
    const summary = summarizeSeasonPublishDraftForWhenPanel(
      localStorage,
      ctx.profileId,
      seasonId
    );
    if (summary) {
      rulesHint.hidden = false;
      rulesHint.textContent = summary;
    } else {
      rulesHint.hidden = false;
      rulesHint.textContent =
        "After naming your season, set window dates and districts in Rules page & launch below. Terminal mint scripts are blocked for self-serve seasons.";
    }
  }

  function syncValue() {
    const remembered = readSeasonWhenId(ctx.profileId);
    if (remembered && !input.value.trim()) {
      input.value = remembered;
    }
  }

  if (input.dataset.wired !== "1") {
    input.dataset.wired = "1";
    input.addEventListener("change", () => {
      const raw = input.value.trim();
      if (!raw) return;
      try {
        const seasonId = persistSeasonWhenId(ctx.profileId, raw);
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent = `Season id saved: ${seasonId}`;
        }
        ctx.onSeasonIdSaved?.(seasonId);
        syncRulesHint();
      } catch (err) {
        if (status instanceof HTMLElement) {
          status.hidden = false;
          status.textContent =
            err instanceof Error ? err.message : "Use lowercase letters, numbers, underscores.";
        }
      }
    });
  }

  syncVisibility();
  syncValue();
  syncRulesHint();

  return {
    refresh: () => {
      syncVisibility();
      syncValue();
      syncRulesHint();
    },
  };
}

/**
 * Season progressive checklist UI on /created/ Live.
 */

import {
  assessSeasonProgressiveChecklist,
  SEASON_PROGRESSIVE_CHECKLIST_ID,
  shouldShowSeasonProgressiveChecklist,
} from "./created-season-progressive-checklist-core.mjs";
import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { readChildObjectRows } from "./child-object-store-core.mjs";
import { mountChildObjectAddHubSections } from "./created-child-object-add-hub.mjs";
import { focusSeasonSetupChecklist } from "./created-season-setup-cta.mjs";
import { SEASON_WHEN_PANEL_ID } from "./created-season-when-panel-core.mjs";

export { SEASON_PROGRESSIVE_CHECKLIST_ID, shouldShowSeasonProgressiveChecklist };

/**
 * @param {HTMLElement} panel
 * @param {ReturnType<typeof assessSeasonProgressiveChecklist>} assessment
 * @param {string} profileId
 */
function renderProgressiveChecklist(panel, assessment, profileId) {
  panel.replaceChildren();
  const heading = document.createElement("h2");
  heading.className = "group-label created-season-progressive-title";
  heading.id = `${SEASON_PROGRESSIVE_CHECKLIST_ID}-title`;
  heading.textContent = "Season setup";
  panel.append(heading);

  const intro = document.createElement("p");
  intro.className = "form-hint created-season-progressive-lead";
  intro.textContent =
    "Three steps before the weekend opens — identity, first checkpoint, then print.";
  panel.append(intro);

  const ol = document.createElement("ol");
  ol.className = "created-season-progressive-steps";
  ol.setAttribute("aria-labelledby", heading.id);

  for (const step of assessment.steps) {
    const li = document.createElement("li");
    li.className = step.done
      ? "created-season-progressive-step is-done"
      : assessment.activeStepId === step.id
        ? "created-season-progressive-step is-active"
        : "created-season-progressive-step";
    li.dataset.stepId = step.id;

    const mark = document.createElement("span");
    mark.className = "created-season-progressive-mark";
    mark.textContent = step.done ? "✓" : assessment.activeStepId === step.id ? "→" : "·";
    mark.setAttribute("aria-hidden", "true");

    const copy = document.createElement("div");
    copy.className = "created-season-progressive-copy";
    const title = document.createElement("strong");
    title.textContent = step.label;
    const detail = document.createElement("p");
    detail.className = "form-hint";
    detail.textContent = step.detail;
    copy.append(title, detail);

    li.append(mark, copy);
    ol.append(li);
  }
  panel.append(ol);

  if (!assessment.complete) {
    const actions = document.createElement("div");
    actions.className = "created-season-progressive-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent =
      assessment.activeStepId === "identity"
        ? "Open setup checklist"
        : assessment.activeStepId === "first_scan_point"
          ? "Add first checkpoint"
          : "Open print pack";
    btn.addEventListener("click", () => {
      if (assessment.activeStepId === "print") {
        const printSection = document.getElementById("child-object-game-node-print-pack");
        if (printSection instanceof HTMLElement) {
          printSection.hidden = false;
          printSection.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      if (assessment.activeStepId === "first_scan_point") {
        mountChildObjectAddHubSections();
        const addHub = document.getElementById("child-object-add-hub");
        if (addHub instanceof HTMLDetailsElement) {
          addHub.hidden = false;
          addHub.open = true;
        } else if (addHub instanceof HTMLElement) {
          addHub.hidden = false;
        }
        const whenPanel = document.getElementById(SEASON_WHEN_PANEL_ID);
        if (whenPanel instanceof HTMLElement) {
          whenPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        const gameSection = document.getElementById("child-object-add-game-node");
        if (gameSection instanceof HTMLElement) gameSection.hidden = false;
        return;
      }
      focusSeasonSetupChecklist(profileId);
    });
    actions.append(btn);
    panel.append(actions);
  }
}

/**
 * @param {{
 *   profileId: string;
 *   session: Record<string, unknown> | null | undefined;
 *   activeRoom?: string | null;
 * }} ctx
 */
export function syncSeasonProgressiveChecklist(ctx) {
  const panel = document.getElementById(SEASON_PROGRESSIVE_CHECKLIST_ID);
  if (!(panel instanceof HTMLElement)) return;

  const show = shouldShowSeasonProgressiveChecklist(ctx);
  panel.hidden = !show;
  panel.setAttribute("aria-hidden", show ? "false" : "true");
  if (!show) return;

  const walletEntry = findWalletEntryByProfileId(ctx.profileId);
  const childObjectRows = readChildObjectRows(localStorage, ctx.profileId);
  const assessment = assessSeasonProgressiveChecklist({
    session: ctx.session,
    walletEntry,
    childObjectRows,
    profileId: ctx.profileId,
  });
  renderProgressiveChecklist(panel, assessment, ctx.profileId);
}

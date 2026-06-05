/**
 * Apply path-aware fresh setup + redirect handoff presentation on /created/.
 */

import { clearCreateHandoff, readCreateHandoff } from "./create-handoff-core.mjs";
import {
  FRESH_SETUP_SAVE_LEAD,
  FRESH_SETUP_SAVE_TITLE,
  resolveCreatedFreshPresentation,
} from "./created-fresh-presentation-core.mjs";

/**
 * @param {{
 *   freshParam: boolean;
 *   mode: import("./created-workspace.mjs").CreatedMode extends never ? "setup" | "control" | "view" : "setup" | "control" | "view";
 *   searchParams?: URLSearchParams;
 *   hash?: string;
 *   session?: Record<string, unknown> | null;
 *   omitSaveStep?: boolean;
 * }} ctx
 */
export function syncCreatedFreshPresentation(ctx) {
  const searchParams = ctx.searchParams ?? new URLSearchParams(location.search);
  const handoff = readCreateHandoff();
  const presentation = resolveCreatedFreshPresentation({
    ...ctx,
    searchParams,
    hash: ctx.hash ?? location.hash,
    handoff,
  });

  const heroTitle = document.querySelector(".created-hero-title");
  const heroMeta = document.getElementById("created-hero-meta");
  const handoffBanner = document.getElementById("created-fresh-handoff-banner");
  const handoffTitle = document.getElementById("created-fresh-handoff-title");
  const handoffDetail = document.getElementById("created-fresh-handoff-detail");
  const setupKicker = document.querySelector(".created-setup-kicker");
  const setupTitle = document.getElementById("created-setup-title");
  const setupSaveLead = document.querySelector("#created-setup-panel-save .created-setup-panel-lead");
  const profileIdRow = document.querySelector(".created-status-profile");
  const copyProfileIdBtn = document.getElementById("copy-profile-id");

  if (presentation.hero && heroTitle) {
    heroTitle.textContent = presentation.hero.title;
  }
  if (presentation.hero && heroMeta) {
    heroMeta.textContent = presentation.hero.lead;
    heroMeta.hidden = !presentation.hero.lead;
  }

  if (handoffBanner && handoffTitle && handoffDetail) {
    if (presentation.handoffBanner) {
      handoffBanner.hidden = false;
      handoffTitle.textContent = presentation.handoffBanner.title;
      handoffDetail.textContent = presentation.handoffBanner.detail;
    } else {
      handoffBanner.hidden = true;
    }
  }

  if (presentation.setupKicker && setupKicker) {
    setupKicker.textContent = presentation.setupKicker;
  }

  if (presentation.hideProtocolDuringFreshSetup) {
    if (setupTitle) setupTitle.textContent = FRESH_SETUP_SAVE_TITLE;
    if (setupSaveLead) setupSaveLead.textContent = FRESH_SETUP_SAVE_LEAD;
    if (profileIdRow instanceof HTMLElement) profileIdRow.hidden = true;
    if (copyProfileIdBtn instanceof HTMLElement) copyProfileIdBtn.hidden = true;
    document.body.dataset.createdFreshSetup = "1";
  } else {
    document.body.removeAttribute("data-created-fresh-setup");
    if (profileIdRow instanceof HTMLElement) profileIdRow.hidden = false;
  }

  if (handoff) {
    clearCreateHandoff();
  }

  return presentation;
}

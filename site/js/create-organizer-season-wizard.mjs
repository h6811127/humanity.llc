/**
 * Organizer season create wizard UI (step 14).
 */

import { loadWallet } from "./device-wallet.mjs";
import {
  gameSeasonSubmitButtonLabel,
  isGameSeasonCreateIntent,
  resolveGameSeasonSubmitStrategy,
} from "./create-organizer-season-core.mjs";

const GAME_SEASON_HERO = {
  title: "Organize a live season",
  lead:
    "Create a season root card with an organizer key, then register game nodes and publish rules from Live — no terminal scripts.",
};

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateOrganizerSeasonWizardUi(searchParams) {
  const active = isGameSeasonCreateIntent(searchParams);
  const wizard = document.getElementById("create-game-season-wizard");
  const glossary = document.getElementById("create-glossary-section");
  const demoStrip = document.querySelector(".create-demo-strip");
  const deployWizard = document.getElementById("create-deploy-wizard");
  const templateAdvanced = document.getElementById("create-template-advanced");
  const submitBtn = document.getElementById("submit");
  const organizerDetails = document.getElementById("create-organizer-details");
  const enableOrganizer = document.getElementById("enable-organizer-revoke");
  const generateOrganizer = document.querySelector(
    'input[name="organizer_key_mode"][value="generate"]'
  );

  if (wizard) wizard.hidden = !active;
  if (glossary) glossary.hidden = active;
  if (demoStrip) demoStrip.hidden = active;
  if (deployWizard) deployWizard.hidden = active;
  if (templateAdvanced) templateAdvanced.hidden = active;

  if (active) {
    const titleEl = document.getElementById("create-hero-title");
    const leadEl = document.getElementById("create-hero-lead");
    if (titleEl) titleEl.textContent = GAME_SEASON_HERO.title;
    if (leadEl) leadEl.textContent = GAME_SEASON_HERO.lead;
    if (organizerDetails instanceof HTMLDetailsElement) organizerDetails.open = true;
    if (enableOrganizer instanceof HTMLInputElement) {
      enableOrganizer.checked = true;
      enableOrganizer.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (generateOrganizer instanceof HTMLInputElement) {
      generateOrganizer.checked = true;
      generateOrganizer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  if (!submitBtn || !active) {
    if (submitBtn && !active && !isGameSeasonCreateIntent(searchParams)) {
      /* leave deploy/general labels to other sync */
    }
    return;
  }

  const strategy = resolveGameSeasonSubmitStrategy({
    searchParams,
    walletEntries: loadWallet(),
  });
  const label = gameSeasonSubmitButtonLabel(strategy);
  if (label) submitBtn.textContent = label;

  const seasonInput = document.getElementById("game-season-id");
  if (seasonInput instanceof HTMLInputElement) {
    seasonInput.required = strategy === "create_season_root";
    seasonInput.disabled = strategy === "redirect_live";
  }
}

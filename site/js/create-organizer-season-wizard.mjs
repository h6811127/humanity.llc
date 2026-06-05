/**
 * Organizer season create wizard UI (step 14).
 */

import { isCreateRoomIsolatedIntent } from "./create-deploy-wizard-core.mjs";
import { syncCreateSeasonForkUi } from "./create-season-fork.mjs";
import { resolveGameSeasonSubmitStrategy } from "./create-season-fork-core.mjs";
import {
  gameSeasonIdFieldUiState,
  gameSeasonSubmitButtonLabel,
} from "./create-season-fork-ui-core.mjs";
import { isGameSeasonCreateIntent } from "./create-organizer-season-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import { pickPreferredGameSeasonRoot } from "./create-organizer-season-core.mjs";

const GAME_SEASON_HERO = {
  title: "Organize a live season",
  lead: "Set up checkpoints and rules from your card page after you create.",
};

/** @type {Record<string, { title: string; lead: string }>} */
const GAME_SEASON_FORK_HERO = {
  existing:
    "One @handle for door plates and season scan points. Add the season operator key on Live.",
  dedicated:
    "New season-only @handle from day one. Best when door plates stay on another account.",
};

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateOrganizerSeasonWizardUi(searchParams) {
  const active = isGameSeasonCreateIntent(searchParams);
  const walletEntries = loadWallet();
  const strategy = active
    ? resolveGameSeasonSubmitStrategy({ searchParams, walletEntries })
    : "standard";
  const showFork = active && strategy === "fork_choose";

  syncCreateSeasonForkUi(searchParams);
  const wizard = document.getElementById("create-game-season-wizard");
  const demoStrip = document.querySelector(".create-demo-strip");
  const deployWizard = document.getElementById("create-deploy-wizard");
  const templateAdvanced = document.getElementById("create-template-advanced");
  const submitBtn = document.getElementById("submit");
  const organizerDetails = document.getElementById("create-organizer-details");
  const enableOrganizer = document.getElementById("enable-organizer-revoke");
  const generateOrganizer = document.querySelector(
    'input[name="organizer_key_mode"][value="generate"]'
  );

  if (wizard) wizard.hidden = !active || showFork;
  if (demoStrip) demoStrip.hidden = active;
  if (active && deployWizard) deployWizard.hidden = true;
  if (templateAdvanced) templateAdvanced.hidden = isCreateRoomIsolatedIntent(searchParams);

  if (active) {
    const titleEl = document.getElementById("create-hero-title");
    const leadEl = document.getElementById("create-hero-lead");
    if (titleEl) titleEl.textContent = GAME_SEASON_HERO.title;
    const forkLead =
      strategy === "create_season_only_root"
        ? GAME_SEASON_FORK_HERO.dedicated
        : strategy === "create_dual_skin_root" || strategy === "use_existing_account"
          ? GAME_SEASON_FORK_HERO.existing
          : GAME_SEASON_HERO.lead;
    if (leadEl) leadEl.textContent = forkLead;
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

  syncGameSeasonIdFieldUi(strategy);
  let preferredRoot = null;
  if (strategy === "redirect_live") {
    preferredRoot = pickPreferredGameSeasonRoot(walletEntries);
  } else if (strategy === "use_existing_account") {
    preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(walletEntries));
  }
  const label = gameSeasonSubmitButtonLabel(strategy, preferredRoot);
  if (label) submitBtn.textContent = label;
}

/**
 * @param {import("./create-season-fork-core.mjs").GameSeasonSubmitStrategy} strategy
 */
export function syncGameSeasonIdFieldUi(strategy) {
  const { showSeasonIdField, redirectHint, inputRequired } = gameSeasonIdFieldUiState(strategy);
  const seasonBlock = document.getElementById("game-season-id-block");
  const redirectHintEl = document.getElementById("game-season-redirect-hint");
  const seasonInput = document.getElementById("game-season-id");

  if (seasonBlock instanceof HTMLElement) {
    seasonBlock.hidden = !showSeasonIdField;
  }
  if (redirectHintEl instanceof HTMLElement) {
    redirectHintEl.hidden = !redirectHint;
    if (redirectHint) redirectHintEl.textContent = redirectHint;
  }
  if (seasonInput instanceof HTMLInputElement) {
    seasonInput.required = inputRequired;
    seasonInput.disabled = false;
    seasonInput.removeAttribute("readonly");
    seasonInput.setAttribute("aria-disabled", "false");
  }
}

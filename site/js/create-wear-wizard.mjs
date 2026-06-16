/**
 * Wear BYOP create wizard UI (step 15).
 */

import { isCreateEntryGateActive } from "./create-entry-state.mjs";
import { readCreateEntryGateBypass } from "./create-entry-state-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import {
  isWearCreateIntent,
  resolveWearSubmitStrategy,
  wearSubmitButtonLabel,
} from "./create-wear-wizard-core.mjs";
import {
  resolveWearTrackChoice,
  WEAR_TRACK_BYOP,
} from "./create-wear-track-chooser-core.mjs";

const WEAR_HERO = {
  title: "Print your own QR wear",
  lead:
    "Pick a @handle, download the code, and print it on your own hoodie or sticker.",
};

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateWearWizardUi(searchParams) {
  const active = isWearCreateIntent(searchParams);
  const wizard = document.getElementById("create-wear-wizard");
  const demoStrip = document.querySelector(".create-demo-strip");
  const deployWizard = document.getElementById("create-deploy-wizard");
  const gameWizard = document.getElementById("create-game-season-wizard");
  const submitBtn = document.getElementById("submit");
  const manifestoLabel = document.querySelector('label[for="manifesto"]');
  const manifestoHint = document.querySelector("#create-fields-general .form-hint");

  const track = resolveWearTrackChoice({ searchParams, storage: sessionStorage });
  const showWizard = active && track === WEAR_TRACK_BYOP;

  if (wizard) wizard.hidden = !showWizard;
  if (demoStrip) demoStrip.hidden = active;
  if (active) {
    if (deployWizard) deployWizard.hidden = true;
    if (gameWizard) gameWizard.hidden = true;
  }

  if (active) {
    const titleEl = document.getElementById("create-hero-title");
    const leadEl = document.getElementById("create-hero-lead");
    if (titleEl) titleEl.textContent = WEAR_HERO.title;
    if (leadEl) leadEl.textContent = WEAR_HERO.lead;
    if (manifestoLabel) {
      manifestoLabel.textContent = "What should strangers read on your wear?";
    }
    if (manifestoHint) {
      manifestoHint.textContent =
        "Your public line on scan — change it later from What opens without reprinting the QR.";
    }
  }

  if (!submitBtn || !active || isCreateEntryGateActive()) return;

  const gateBypass = readCreateEntryGateBypass(sessionStorage, searchParams);

  const strategy = resolveWearSubmitStrategy({
    searchParams,
    walletEntries: loadWallet(),
    gateBypass,
  });
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  const label = wearSubmitButtonLabel(strategy, preferredRoot);
  if (label) submitBtn.textContent = label;
}

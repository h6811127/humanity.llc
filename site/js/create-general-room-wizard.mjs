/**
 * General-account create room UI sync.
 */

import { isCreateRoomIsolatedIntent } from "./create-deploy-wizard-core.mjs";
import { isGeneralCreateIntent } from "./create-general-room-wizard-core.mjs";

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateGeneralRoomUi(searchParams) {
  const active = isGeneralCreateIntent(searchParams);
  const deployWizard = document.getElementById("create-deploy-wizard");
  const wearWizard = document.getElementById("create-wear-wizard");
  const gameWizard = document.getElementById("create-game-season-wizard");
  const templateAdvanced = document.getElementById("create-template-advanced");
  const convergenceNudge = document.getElementById("create-add-object-nudge");
  const flatCompat = document.getElementById("create-flat-pilot-compat");
  const demoStrip = document.querySelector(".create-demo-strip");
  const manifestoLabel = document.querySelector('label[for="manifesto"]');
  const manifestoHint = document.querySelector("#create-fields-general .form-hint");

  if (active) {
    if (deployWizard) deployWizard.hidden = true;
    if (wearWizard) wearWizard.hidden = true;
    if (gameWizard) gameWizard.hidden = true;
    if (demoStrip) demoStrip.hidden = true;
  }
  if (templateAdvanced) templateAdvanced.hidden = isCreateRoomIsolatedIntent(searchParams);
  if (convergenceNudge && active) convergenceNudge.hidden = true;
  if (flatCompat && active) flatCompat.hidden = true;

  if (active) {
    if (manifestoLabel) manifestoLabel.textContent = "What should people read?";
    if (manifestoHint) {
      manifestoHint.textContent = "Plain text only, 280 characters max.";
    }
  }
}

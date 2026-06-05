/**
 * General-account create room UI sync.
 */

import { isGeneralCreateIntent } from "./create-general-room-wizard-core.mjs";

/**
 * @param {URLSearchParams} searchParams
 */
export function syncCreateGeneralRoomUi(searchParams) {
  const active = isGeneralCreateIntent(searchParams);
  const deployWizard = document.getElementById("create-deploy-wizard");
  const wearWizard = document.getElementById("create-wear-wizard");
  const gameWizard = document.getElementById("create-game-season-wizard");
  const demoStrip = document.querySelector(".create-demo-strip");
  const manifestoLabel = document.querySelector('label[for="manifesto"]');
  const manifestoHint = document.querySelector("#create-fields-general .form-hint");

  if (active) {
    if (deployWizard) deployWizard.hidden = true;
    if (wearWizard) wearWizard.hidden = true;
    if (gameWizard) gameWizard.hidden = true;
    if (demoStrip) demoStrip.hidden = true;
  }

  if (active) {
    if (manifestoLabel) manifestoLabel.textContent = "What should people read?";
    if (manifestoHint) {
      manifestoHint.textContent = "Plain text only, 280 characters max.";
    }
  }
}

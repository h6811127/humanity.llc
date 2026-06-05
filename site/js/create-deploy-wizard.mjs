/**
 * Deploy-intent create wizard UI sync.
 */

import { loadWallet } from "./device-wallet.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import {
  deploySubmitButtonLabel,
  isDeployRoomCreateIntent,
  isDeployWizardIntent,
  resolveDeploySubmitStrategy,
} from "./create-deploy-wizard-core.mjs";

/**
 * @param {URLSearchParams} searchParams
 * @param {string} template
 */
export function syncCreateDeployWizardUi(searchParams, template) {
  const deployWizard = document.getElementById("create-deploy-wizard");
  const demoStrip = document.querySelector(".create-demo-strip");
  const submitBtn = document.getElementById("submit");
  const objectLabel = document.getElementById("deploy-object-label");
  const scannerLine = document.getElementById("deploy-scanner-line");
  const objectLabelHint = document.getElementById("deploy-object-label-hint");
  const scannerLineLabel = document.getElementById("deploy-scanner-line-label");
  const scannerLineHint = document.getElementById("deploy-scanner-line-hint");

  const isPilot = template === "status_plate" || template === "lost_item_relay";
  const active = isDeployWizardIntent(searchParams) && isPilot;
  const deployRoom = isDeployRoomCreateIntent(searchParams) && active;

  const gameWizard = document.getElementById("create-game-season-wizard");
  const wearWizard = document.getElementById("create-wear-wizard");

  if (deployWizard) deployWizard.hidden = !active;
  if (demoStrip) demoStrip.hidden = active;
  if (gameWizard && deployRoom) gameWizard.hidden = true;
  if (wearWizard && deployRoom) wearWizard.hidden = true;

  if (active && template === "lost_item_relay") {
    if (objectLabel) objectLabel.placeholder = "House keys";
    if (scannerLine) scannerLine.placeholder = "Lost — contact owner through relay";
    if (objectLabelHint) {
      objectLabelHint.textContent = "Shown as the headline when someone scans — not your phone number.";
    }
    const objectTitle = document.getElementById("deploy-object-label-title");
    if (objectTitle) objectTitle.textContent = "What is this tag on?";
    if (scannerLineLabel) scannerLineLabel.textContent = "What should finders see?";
    if (scannerLineHint) {
      scannerLineHint.textContent =
        "Return instructions only. Revoke when recovered or if the relay is abused.";
    }
  } else if (active) {
    if (objectLabel) objectLabel.placeholder = "Studio door";
    if (scannerLine) scannerLine.placeholder = "Open · Thu–Sun until 9 PM";
    if (objectLabelHint) {
      objectLabelHint.textContent = "Shown as the headline when someone scans.";
    }
    const objectTitle = document.getElementById("deploy-object-label-title");
    if (objectTitle) objectTitle.textContent = "What is this on?";
    if (scannerLineLabel) scannerLineLabel.textContent = "What should scanners see?";
    if (scannerLineHint) {
      scannerLineHint.textContent =
        "What scanners see — change it later on What opens without reprinting the QR.";
    }
  }

  if (!submitBtn || !active) {
    if (submitBtn && !active) submitBtn.textContent = "Create and get QR";
    return;
  }

  const strategy = resolveDeploySubmitStrategy({
    searchParams,
    template,
    walletEntries: loadWallet(),
  });
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  const label = deploySubmitButtonLabel(template, strategy, preferredRoot);
  if (label) submitBtn.textContent = label;
}

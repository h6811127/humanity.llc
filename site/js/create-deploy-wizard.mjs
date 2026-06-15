/**
 * Deploy-intent create wizard UI sync.
 */

import { isCreateEntryGateActive } from "./create-entry-state.mjs";
import { readCreateEntryGateBypass } from "./create-entry-state-core.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";
import {
  DEPLOY_OBJECT_TYPE_OPTIONS,
  deploySubmitButtonLabel,
  isDeployRoomCreateIntent,
  isDeployWizardIntent,
  normalizeDeployObjectTemplate,
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
  syncDeployObjectTypeChooser(template, { active });

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

  if (isCreateEntryGateActive()) return;

  const gateBypass = readCreateEntryGateBypass(sessionStorage, searchParams);

  const strategy = resolveDeploySubmitStrategy({
    searchParams,
    template,
    walletEntries: loadWallet(),
    gateBypass,
  });
  const preferredRoot = pickPreferredGeneralRoot(listGeneralRootsWithKeys(loadWallet()));
  const label = deploySubmitButtonLabel(template, strategy, preferredRoot);
  if (label) submitBtn.textContent = label;
}

/**
 * @param {string} template
 * @param {{ active?: boolean }} [opts]
 */
export function syncDeployObjectTypeChooser(template, opts = {}) {
  const chooser = document.getElementById("deploy-object-type-chooser");
  if (!chooser) return;
  chooser.hidden = opts.active === false;
  const normalized = normalizeDeployObjectTemplate(template);
  chooser
    .querySelectorAll("[data-deploy-object-template]")
    .forEach((el) => {
      const selected = el.getAttribute("data-deploy-object-template") === normalized;
      el.classList.toggle("is-selected", selected);
      el.setAttribute("aria-pressed", selected ? "true" : "false");
    });
}

/**
 * @param {{ onSelectTemplate?: (template: string) => void }} handlers
 */
export function initCreateDeployObjectTypeChooser(handlers = {}) {
  const chooser = document.getElementById("deploy-object-type-chooser");
  if (!chooser) return;
  chooser.replaceChildren();

  for (const option of DEPLOY_OBJECT_TYPE_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "create-deploy-object-type-option";
    button.dataset.deployObjectTemplate = option.template;
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span class="create-deploy-object-type-title">${option.title}</span>
      <span class="create-deploy-object-type-sub">${option.sub}</span>`;
    button.addEventListener("click", () => {
      handlers.onSelectTemplate?.(option.template);
    });
    chooser.appendChild(button);
  }
}

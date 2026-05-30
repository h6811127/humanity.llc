/**
 * Sync create-page convergence nudge (step 14).
 */

import { loadWallet } from "./device-wallet.mjs";
import {
  createConvergenceNudgeCopy,
  createdAddObjectHref,
  isPilotObjectTemplate,
  listGeneralRootsWithKeys,
  pickPreferredGeneralRoot,
} from "./create-flow-convergence-core.mjs";

/**
 * @param {string} template
 */
export function syncCreateFlowConvergence(template) {
  const nudgeEl = document.getElementById("create-add-object-nudge");
  const titleEl = document.getElementById("create-add-object-nudge-title");
  const bodyEl = document.getElementById("create-add-object-nudge-body");
  const primaryEl = document.getElementById("create-add-object-nudge-primary");
  const generalBtn = document.getElementById("create-add-object-nudge-general");
  const hintEl = document.getElementById("create-template-hint");
  const compatEl = document.getElementById("create-flat-pilot-compat");

  const isPilot = isPilotObjectTemplate(template);
  if (hintEl) {
    hintEl.hidden = isPilot;
  }
  if (!isPilot) {
    if (nudgeEl) nudgeEl.hidden = true;
    if (compatEl) compatEl.hidden = true;
    return;
  }

  const roots = listGeneralRootsWithKeys(loadWallet());
  const preferredRoot = pickPreferredGeneralRoot(roots);
  const copy = createConvergenceNudgeCopy(template, {
    preferredRoot,
    rootCount: roots.length,
  });

  if (titleEl) titleEl.textContent = copy.title;
  if (bodyEl) bodyEl.textContent = copy.body;

  if (primaryEl) {
    if (preferredRoot) {
      primaryEl.textContent = copy.primaryLabel;
      primaryEl.hidden = false;
      const href = createdAddObjectHref(preferredRoot, template, location.origin);
      if (href) {
        primaryEl.setAttribute("href", href);
      } else {
        primaryEl.removeAttribute("href");
      }
      primaryEl.removeAttribute("role");
    } else {
      primaryEl.textContent = copy.primaryLabel;
      primaryEl.hidden = false;
      primaryEl.removeAttribute("href");
      primaryEl.setAttribute("role", "button");
    }
  }

  if (generalBtn) {
    generalBtn.hidden = !copy.showGeneralSwitch;
    generalBtn.textContent = preferredRoot ? "Create general card instead" : "Use general card";
  }

  if (compatEl) {
    compatEl.hidden = false;
    if (compatEl instanceof HTMLDetailsElement) {
      compatEl.open = !copy.collapseLegacyForm;
    }
  }

  if (nudgeEl) nudgeEl.hidden = false;
}

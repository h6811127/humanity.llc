/**
 * Bottom sheet host for #device-hub on shell pages.
 */
import { prefersReducedMotion } from "./device-shell-motion.mjs";

const hub = document.getElementById("device-hub");
let backdrop = document.getElementById("device-hub-backdrop");

export function isHubSheet() {
  return !!hub?.classList.contains("device-hub--sheet");
}

function ensureBackdrop() {
  if (!hub || backdrop) return backdrop;
  backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = "device-hub-backdrop";
  backdrop.className = "device-hub-backdrop";
  backdrop.setAttribute("aria-label", "Close device panel");
  backdrop.hidden = true;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  });
  return backdrop;
}

export function setHubSheetOpen(open) {
  if (!isHubSheet() || !hub) return;
  ensureBackdrop();
  hub.classList.toggle("device-hub-collapsed", !open);
  if (backdrop) backdrop.hidden = !open;
  document.body.classList.toggle("device-hub-sheet-open", open);
  hub.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    hub.removeAttribute("inert");
  } else {
    hub.setAttribute("inert", "");
  }
  if (open && !prefersReducedMotion()) {
    hub.scrollTop = 0;
  }
}

export function bindHubSheetUi() {
  if (!isHubSheet()) return;
  ensureBackdrop();
  const closeBtn = hub?.querySelector(".device-hub-sheet-close");
  closeBtn?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  });
}

bindHubSheetUi();

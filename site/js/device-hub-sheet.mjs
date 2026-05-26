/**
 * Bottom sheet host for #device-hub on shell pages.
 */
import { prefersReducedMotion } from "./device-shell-motion.mjs";

const HUB_OPEN_KEY = "hc_hub_open";

const hub = document.getElementById("device-hub");
const chrome = document.getElementById("top-chrome");
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

export function closeHubBeforeNavigation() {
  sessionStorage.setItem(HUB_OPEN_KEY, "0");
  if (!isHubSheet() || !hub) return;
  setHubSheetOpen(false);
}

export function setHubSheetOpen(open) {
  if (!isHubSheet() || !hub) return;
  ensureBackdrop();
  hub.classList.toggle("device-hub-collapsed", !open);
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.classList.toggle("is-visible", open);
  }
  document.body.classList.toggle("device-hub-sheet-open", open);
  chrome?.classList.toggle("top-chrome--hub-locked", open);
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

/** Clear body/backdrop when hub DOM is collapsed but sheet-open classes stuck (bfcache, etc.). */
export function reconcileHubSheetState() {
  if (!isHubSheet() || !hub) return;
  if (!hub.classList.contains("device-hub-collapsed")) return;

  const bodyOpen = document.body.classList.contains("device-hub-sheet-open");
  const locked = chrome?.classList.contains("top-chrome--hub-locked");
  if (bodyOpen || locked) {
    setHubSheetOpen(false);
    return;
  }

  ensureBackdrop();
  if (backdrop && (!backdrop.hidden || backdrop.classList.contains("is-visible"))) {
    backdrop.hidden = true;
    backdrop.classList.remove("is-visible");
  }
}

function bindHubSheetUi() {
  if (!isHubSheet()) return;
  ensureBackdrop();
  const closeBtn = hub?.querySelector(".device-hub-sheet-close");
  closeBtn?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("hc-hub-sheet-close"));
  });

  hub?.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest?.("a[href]");
      if (!link || !hub.contains(link)) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      closeHubBeforeNavigation();
    },
    true
  );
}

bindHubSheetUi();
reconcileHubSheetState();

window.addEventListener("pagehide", closeHubBeforeNavigation);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) reconcileHubSheetState();
});

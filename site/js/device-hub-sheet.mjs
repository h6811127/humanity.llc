/**
 * Bottom sheet host for #device-hub on shell pages.
 */
import { prefersReducedMotion } from "./device-shell-motion.mjs";
import { hubSheetReconcileAction } from "./device-hub-sheet-core.mjs?v=67";
import {
  bindSheetLifecycleReconcile,
  syncInboxBackdropForOpenHub,
  syncSheetBackdropClosed,
} from "./device-sheet-backdrop-sync.mjs?v=67";
import { LIVE_CONTROL_POLL_SCOPE_CHANGED } from "./device-live-control-inbox.mjs";

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
  backdrop.setAttribute("aria-hidden", "true");
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
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    if (!open) syncSheetBackdropClosed(backdrop);
  }
  document.body.classList.toggle("device-hub-sheet-open", open);
  chrome?.classList.toggle("top-chrome--hub-locked", open);
  hub.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    hub.removeAttribute("inert");
  } else {
    hub.setAttribute("inert", "");
    reconcileHubSheetState();
  }
  if (open && !prefersReducedMotion()) {
    hub.scrollTop = 0;
  }
  window.dispatchEvent(new Event(LIVE_CONTROL_POLL_SCOPE_CHANGED));
}

/** Clear body/backdrop when hub DOM is collapsed but sheet-open classes stuck (bfcache, etc.). */
export function reconcileHubSheetState() {
  syncInboxBackdropForOpenHub();
  if (!isHubSheet() || !hub) return;

  ensureBackdrop();
  const action = hubSheetReconcileAction({
    hubCollapsed: hub.classList.contains("device-hub-collapsed"),
    bodySheetOpen: document.body.classList.contains("device-hub-sheet-open"),
    chromeHubLocked: chrome?.classList.contains("top-chrome--hub-locked") ?? false,
    backdropHidden: backdrop?.hidden !== false,
    backdropVisibleClass: backdrop?.classList.contains("is-visible") ?? false,
  });

  if (action === "close_sheet") {
    setHubSheetOpen(false);
    return;
  }
  if (action === "hide_backdrop" && backdrop) {
    syncSheetBackdropClosed(backdrop);
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
bindSheetLifecycleReconcile(reconcileHubSheetState);

window.addEventListener("pagehide", closeHubBeforeNavigation);

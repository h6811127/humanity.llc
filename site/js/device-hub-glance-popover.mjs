/**
 * Glance menu anchored to the status dot (compact menu before full hub sheet).
 */
import { hubGlanceHasContent } from "./device-hub-glance.mjs";

function getPopoverRoot() {
  return (
    document.getElementById("device-hub-glance-popover") ||
    document.getElementById("wallet-hub-glance-popover")
  );
}

function getDotBtn() {
  return document.getElementById("brand-status-dot-btn");
}

function hubSheetIsOpen() {
  const hub = document.getElementById("device-hub");
  return (
    !!hub?.classList.contains("device-hub--sheet") &&
    !hub.classList.contains("device-hub-collapsed")
  );
}

export function isGlancePopoverOpen() {
  const root = getPopoverRoot();
  return !!root && !root.hidden;
}

export function closeGlancePopover() {
  const root = getPopoverRoot();
  if (!root || root.hidden) return;
  root.hidden = true;
  document.body.classList.remove("device-glance-popover-open");
  const btn = getDotBtn();
  if (btn) {
    btn.setAttribute("aria-expanded", hubSheetIsOpen() ? "true" : "false");
  }
}

export function setGlancePopoverOpen(open) {
  const root = getPopoverRoot();
  if (!root) return;
  if (open && (hubSheetIsOpen() || !hubGlanceHasContent())) {
    closeGlancePopover();
    return;
  }
  if (!open) {
    closeGlancePopover();
    return;
  }
  root.hidden = false;
  document.body.classList.add("device-glance-popover-open");
  const btn = getDotBtn();
  if (btn) btn.setAttribute("aria-expanded", "true");
}

export function toggleGlancePopover() {
  setGlancePopoverOpen(!isGlancePopoverOpen());
}

function bindDismiss() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!isGlancePopoverOpen()) return;
      const root = getPopoverRoot();
      const btn = getDotBtn();
      const target = e.target;
      if (root?.contains(target) || btn?.contains(target)) return;
      closeGlancePopover();
    },
    true
  );
}

bindDismiss();

window.addEventListener("hc-hub-sheet-close", () => closeGlancePopover());
window.addEventListener("hc-glance-popover-close", () => closeGlancePopover());

/**
 * Device shell motion  -  spring continuity, reduced-motion safe.
 */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function prefersReducedMotion() {
  return reduced;
}

export function hapticLight() {
  if (reduced) return;
  try {
    navigator.vibrate?.(1);
  } catch {
    /* ignore */
  }
}

function bindHubExpandMotion() {
  const hub = document.getElementById("device-hub");
  if (!hub) return;

  const observer = new MutationObserver(() => {
    const open = !hub.classList.contains("device-hub-collapsed");
    hub.classList.toggle("device-hub--open", open);
  });
  observer.observe(hub, { attributes: true, attributeFilter: ["class"] });
}

function bindListPressFeedback() {
  document.querySelectorAll(".device-hub, .screen").forEach((root) => {
    root.addEventListener(
      "click",
      (e) => {
        const row = e.target.closest?.(
          ".list-action a, .list-action button, .device-activity-open, .hub-card-item"
        );
        if (!row || reduced) return;
        row.classList.add("shell-press-active");
        window.setTimeout(() => row.classList.remove("shell-press-active"), 220);
      },
      true
    );
  });
}

bindHubExpandMotion();
bindListPressFeedback();

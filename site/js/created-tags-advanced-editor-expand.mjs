/**
 * Expand Advanced editor + legacy hub (Phase 2B shared helper).
 */

/**
 * @param {{ scrollTarget?: HTMLElement | null; scrollTargetId?: string }} [opts]
 */
export function expandTagsAdvancedEditor(opts = {}) {
  const wrapper = document.getElementById("created-tags-advanced-editor");
  const hub = document.getElementById("child-object-add-hub");
  if (wrapper && typeof wrapper === "object") {
    if ("hidden" in wrapper) wrapper.hidden = false;
    if ("open" in wrapper && typeof wrapper.open === "boolean") {
      wrapper.open = true;
    }
  }
  if (hub && typeof hub === "object") {
    if ("hidden" in hub) hub.hidden = false;
    if ("open" in hub && typeof hub.open === "boolean") {
      hub.open = true;
    }
  }

  const scrollTarget =
    opts.scrollTarget ??
    (opts.scrollTargetId ? document.getElementById(opts.scrollTargetId) : null) ??
    hub;
  scrollTarget?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

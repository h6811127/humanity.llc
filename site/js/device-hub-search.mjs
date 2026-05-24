/**
 * Shared Phase 1–2 local search over a device hub root element.
 */

/**
 * @param {HTMLElement | null} hub
 * @param {string} query
 */
export function applyDeviceHubSearch(hub, query) {
  const q = query.trim().toLowerCase();
  if (!hub) return { matchCount: 0, groups: {} };

  const groups = {};
  hub.querySelectorAll("[data-hub-group]").forEach((groupEl) => {
    const id = groupEl.id || groupEl.getAttribute("data-hub-group") || "unknown";
    const items = [...groupEl.querySelectorAll("[data-hub-searchable]")];
    let anyVisible = false;
    for (const el of items) {
      const text = (el.dataset.hubSearchable || "").toLowerCase();
      const match = !q || text.includes(q);
      el.hidden = !match;
      if (match) anyVisible = true;
    }
    const hasItems = items.length > 0;
    groupEl.hidden = hasItems && !anyVisible;
    groups[id] = { anyVisible, hasItems };
  });

  const matchCount = [...hub.querySelectorAll("[data-hub-searchable]")].filter(
    (el) => !el.hidden
  ).length;

  return { matchCount, groups };
}

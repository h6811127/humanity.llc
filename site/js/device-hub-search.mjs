/**
 * Shared Phase 1–2 local search over a device hub root element.
 */

import { shouldHubSearchApplyVisibility } from "./device-hub-search-core.mjs";

const ALWAYS_VISIBLE_GROUPS = new Set(["shortcuts", "import"]);

/**
 * @param {HTMLElement | null} hub
 * @param {string} query
 */
export function applyDeviceHubSearch(hub, query) {
  const q = query.trim().toLowerCase();
  if (!hub) return { matchCount: 0, groups: {} };

  const groups = {};
  hub.querySelectorAll("[data-hub-group]").forEach((groupEl) => {
    const groupKey = groupEl.getAttribute("data-hub-group") || groupEl.id || "unknown";
    const items = [...groupEl.querySelectorAll("[data-hub-searchable]")];
    const keepGroupVisible = ALWAYS_VISIBLE_GROUPS.has(groupKey);

    if (!q) {
      groupEl.hidden = false;
      for (const el of items) {
        if (!shouldHubSearchApplyVisibility(el)) continue;
        el.hidden = false;
      }
      groups[groupKey] = { anyVisible: true, hasItems: items.length > 0 };
      return;
    }

    let anyVisible = false;
    for (const el of items) {
      if (!shouldHubSearchApplyVisibility(el)) continue;
      const text = (el.dataset.hubSearchable || "").toLowerCase();
      const match = text.includes(q);
      el.hidden = !match;
      if (match) anyVisible = true;
    }
    const hasItems = items.length > 0;
    groupEl.hidden = keepGroupVisible ? false : hasItems && !anyVisible;
    groups[groupKey] = { anyVisible, hasItems };
  });

  const matchCount = [...hub.querySelectorAll("[data-hub-searchable]")].filter(
    (el) => !el.hidden
  ).length;

  return { matchCount, groups };
}

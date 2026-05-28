/**
 * Hub saved-card visibility for network refresh priority (request budget Phase 8c).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

/**
 * Profile IDs whose row rects intersect the scroll viewport.
 *
 * @param {Array<{ profileId: string, top: number, bottom: number }>} rowRects
 * @param {{ top: number, bottom: number }} viewport
 * @returns {string[]}
 */
export function profileIdsWithVisibleRows(rowRects, viewport) {
  if (!rowRects.length) return [];
  return rowRects
    .filter((row) => row.bottom > viewport.top && row.top < viewport.bottom)
    .map((row) => row.profileId)
    .filter((id) => typeof id === "string" && id.length > 0);
}

/**
 * Put visible profile rows first so round-robin / serial refresh hits on-screen cards.
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {Iterable<string>} visibleProfileIds
 * @returns {T[]}
 */
export function orderEntriesVisibleFirst(entries, visibleProfileIds) {
  const visible = new Set(visibleProfileIds);
  if (visible.size === 0 || entries.length <= 1) return entries;
  const inView = [];
  const rest = [];
  for (const entry of entries) {
    const pid = entry?.profile_id;
    if (typeof pid === "string" && visible.has(pid)) inView.push(entry);
    else rest.push(entry);
  }
  if (inView.length === 0) return entries;
  return [...inView, ...rest];
}

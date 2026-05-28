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

/**
 * True when the scroll container is within `thresholdPx` of its bottom.
 *
 * @param {{ scrollTop: number, scrollHeight: number, clientHeight: number }} metrics
 * @param {number} [thresholdPx]
 */
export function isScrollNearBottom(metrics, thresholdPx = 120) {
  const threshold = Math.max(0, Math.floor(thresholdPx || 0));
  const { scrollTop, scrollHeight, clientHeight } = metrics;
  if (scrollHeight <= clientHeight) return false;
  return scrollTop + clientHeight >= scrollHeight - threshold;
}

/**
 * Initial/incremental DOM window for very large expanded hub summary rows.
 *
 * @template T
 * @param {T[]} entries
 * @param {{ limit: number }} options
 * @returns {{ rows: T[], remaining: number }}
 */
export function visibleSummaryRowWindow(entries, options) {
  const limit = Math.max(0, Math.floor(options.limit || 0));
  const rows = entries.slice(0, limit);
  return {
    rows,
    remaining: Math.max(0, entries.length - rows.length),
  };
}

/**
 * Next summary-row window size after Show more or scroll expand.
 *
 * @param {number} currentLimit
 * @param {number} increment
 * @param {number} totalCount
 * @returns {number}
 */
export function nextSummaryRowWindowLimit(currentLimit, increment, totalCount) {
  const safeLimit = Math.max(0, Math.floor(currentLimit || 0));
  const safeIncrement = Math.max(0, Math.floor(increment || 0));
  const safeTotal = Math.max(0, Math.floor(totalCount || 0));
  return Math.min(safeLimit + safeIncrement, safeTotal);
}

/**
 * @param {number} remaining
 * @param {number} increment
 * @returns {number}
 */
export function summaryRowLoadIncrement(remaining, increment) {
  const safeRemaining = Math.max(0, Math.floor(remaining || 0));
  const safeIncrement = Math.max(0, Math.floor(increment || 0));
  return Math.min(safeIncrement, safeRemaining);
}

/**
 * Grow the summary-row window so viewport-visible cards stay mounted (+ overscan).
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {number} currentLimit
 * @param {Iterable<string>} visibleProfileIds
 * @param {{ overscan?: number }} [options]
 * @returns {number}
 */
export function expandSummaryRowLimitForVisible(
  entries,
  currentLimit,
  visibleProfileIds,
  options = {}
) {
  const overscan = Math.max(0, Math.floor(options.overscan ?? 2));
  const visible = new Set(visibleProfileIds);
  if (visible.size === 0 || entries.length === 0) {
    return Math.min(entries.length, Math.max(0, Math.floor(currentLimit)));
  }
  let needed = Math.max(0, Math.floor(currentLimit));
  entries.forEach((entry, index) => {
    const pid = entry?.profile_id;
    if (typeof pid === "string" && visible.has(pid)) {
      needed = Math.max(needed, index + 1 + overscan);
    }
  });
  return Math.min(entries.length, needed);
}

/**
 * Next summary-row limit after viewport scroll (visible rows + optional near-end increment).
 *
 * @template {{ profile_id?: unknown }} T
 * @param {T[]} entries
 * @param {number} currentLimit
 * @param {{ visibleProfileIds?: Iterable<string>, nearEnd?: boolean, increment?: number, overscan?: number }} [options]
 * @returns {number}
 */
export function summaryRowLimitAfterViewportLoad(entries, currentLimit, options = {}) {
  const increment = Math.max(0, Math.floor(options.increment ?? 0));
  let limit = expandSummaryRowLimitForVisible(
    entries,
    currentLimit,
    options.visibleProfileIds ?? [],
    { overscan: options.overscan }
  );
  if (options.nearEnd === true && increment > 0 && limit < entries.length) {
    limit = Math.min(entries.length, limit + increment);
  }
  return limit;
}

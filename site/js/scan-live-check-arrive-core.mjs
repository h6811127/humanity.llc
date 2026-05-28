/**
 * Live check “data arriving” timing (pure).
 * @see docs/SCAN_PAGE_TRUST_UI.md · docs/VISUAL_IDENTITY_PRINCIPLES.md
 */

export const SCAN_ARRIVE_CHECKING_LABEL = "Checking live status…";

/** Minimum time in checking phase so motion reads intentional (SSR pages). */
export const SCAN_ARRIVE_MIN_CHECKING_MS = 380;

/** Delay between revealing each `.scan-arrive-item`. */
export const SCAN_ARRIVE_ROW_STAGGER_MS = 90;

/** Hero border Settle + dot sync window. */
export const SCAN_ARRIVE_SETTLE_MS = 550;

/**
 * @param {number} itemCount
 * @param {{ staggerMs?: number, minCheckingMs?: number, settleMs?: number }} [opts]
 */
export function scanArriveSequenceMs(itemCount, opts = {}) {
  const stagger = opts.staggerMs ?? SCAN_ARRIVE_ROW_STAGGER_MS;
  const minChecking = opts.minCheckingMs ?? SCAN_ARRIVE_MIN_CHECKING_MS;
  const settle = opts.settleMs ?? SCAN_ARRIVE_SETTLE_MS;
  const staggerTotal = Math.max(0, itemCount) * stagger;
  return minChecking + staggerTotal + settle;
}

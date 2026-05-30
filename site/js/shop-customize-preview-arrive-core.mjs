/**
 * Customize preview “object forming” timing (pure).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 3
 */

export const CUSTOMIZE_PREVIEW_FORMING_LABEL = "Forming your live object…";

/** Minimum forming phase so Settle reads intentional (mirrors scan Path 2). */
export const CUSTOMIZE_PREVIEW_MIN_FORMING_MS = 380;

/** Delay between revealing each `.shop-customize-arrive-item`. */
export const CUSTOMIZE_PREVIEW_ROW_STAGGER_MS = 90;

/** Vessel border Settle window. */
export const CUSTOMIZE_PREVIEW_SETTLE_MS = 550;

export const CUSTOMIZE_PREVIEW_PENDING_CLASS = "shop-customize-mock--pending";
export const CUSTOMIZE_PREVIEW_SETTLED_CLASS = "shop-customize-mock--settled";
export const CUSTOMIZE_PREVIEW_VESSEL_PULSE_CLASS = "shop-customize-mock__vessel--settle-pulse";
export const CUSTOMIZE_PREVIEW_ARRIVE_VISIBLE_CLASS = "shop-customize-arrive-item--visible";

/**
 * @param {number} itemCount
 * @param {{ staggerMs?: number, minFormingMs?: number, settleMs?: number }} [opts]
 */
export function customizePreviewArriveSequenceMs(itemCount, opts = {}) {
  const stagger = opts.staggerMs ?? CUSTOMIZE_PREVIEW_ROW_STAGGER_MS;
  const minForming = opts.minFormingMs ?? CUSTOMIZE_PREVIEW_MIN_FORMING_MS;
  const settle = opts.settleMs ?? CUSTOMIZE_PREVIEW_SETTLE_MS;
  const staggerTotal = Math.max(0, itemCount) * stagger;
  return minForming + staggerTotal + settle;
}

/**
 * Truncate manifesto for preview vessel (single line).
 * @param {string | null | undefined} line
 * @param {number} [maxLen]
 */
export function customizePreviewManifestoTeaser(line, maxLen = 72) {
  if (typeof line !== "string") return null;
  const raw = line.trim();
  if (!raw) return null;
  const first = (raw.split("\n")[0]?.trim() ?? raw).replace(/\s+/g, " ");
  if (!first) return null;
  if (first.length <= maxLen) return first;
  return `${first.slice(0, maxLen - 1).trim()}…`;
}

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
 * True when the visible strip label already matches resolver SSR truth.
 * @param {string | null | undefined} arriveLabel data-arrive-label
 * @param {string | null | undefined} statusText .scan-arrive-status-label text
 */
export function scanArriveLabelsAgree(arriveLabel, statusText) {
  const label = arriveLabel?.trim();
  const status = statusText?.trim();
  if (!label || !status) return false;
  return status === label;
}

/**
 * Skip the artificial checking phase when SSR and the live strip already agree.
 * Offline loads may show stale cached HTML — keep checking motion in that case.
 *
 * @param {{
 *   arriveLabel?: string | null,
 *   statusText?: string | null,
 *   online?: boolean,
 * }} input
 */
export function shouldSkipScanArriveCheckingPhase(input = {}) {
  const { arriveLabel, statusText, online = true } = input;
  if (!online) return false;
  return scanArriveLabelsAgree(arriveLabel, statusText);
}

/**
 * RC-8: Worker SSR embeds the settled strip label on `data-arrive-label` and in
 * `.scan-arrive-status-label`. When both match, skip the artificial checking hold.
 * @param {{ querySelector?: (sel: string) => Element | null } | null | undefined} hero
 * @param {{ online?: boolean }} [opts]
 */
export function shouldUseScanArriveSsrFastPath(hero, opts = {}) {
  if (!hero?.querySelector) return false;
  const strip = hero.querySelector(".scan-arrive-strip");
  if (!strip || typeof strip !== "object") return false;
  const arriveLabel = strip.dataset?.arriveLabel;
  const statusEl = strip.querySelector?.(".scan-arrive-status-label");
  const statusText =
    statusEl && typeof statusEl === "object" && "textContent" in statusEl
      ? statusEl.textContent
      : null;
  return shouldSkipScanArriveCheckingPhase({
    arriveLabel,
    statusText,
    online: opts.online ?? true,
  });
}

/**
 * @param {number} itemCount
 * @param {{ staggerMs?: number, minCheckingMs?: number, settleMs?: number, ssrFastPath?: boolean }} [opts]
 */
export function scanArriveSequenceMs(itemCount, opts = {}) {
  const stagger = opts.staggerMs ?? SCAN_ARRIVE_ROW_STAGGER_MS;
  const minChecking = opts.ssrFastPath ? 0 : opts.minCheckingMs ?? SCAN_ARRIVE_MIN_CHECKING_MS;
  const settle = opts.settleMs ?? SCAN_ARRIVE_SETTLE_MS;
  const staggerTotal = Math.max(0, itemCount) * stagger;
  return minChecking + staggerTotal + settle;
}

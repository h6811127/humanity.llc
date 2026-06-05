/**
 * Live object card copy + timing (owner Register A).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 4–5
 */

/** Level 0 limit teaser — mirrors scan hero, owner-facing. */
export const CREATED_LIVE_OBJECT_LIMIT_TEASER =
  "Scanners see your live line. Not who holds the object.";

export const CREATED_LIVE_PUBLISH_CONFIRM = "Same ink. New meaning.";

/** Minimum forming phase before card Settle (aligns with customize preview). */
export const CREATED_LIVE_OBJECT_MIN_ARRIVE_MS = 320;

export const CREATED_LIVE_OBJECT_ROW_STAGGER_MS = 80;

export const CREATED_LIVE_OBJECT_SETTLE_MS = 520;

export const CREATED_LIVE_OBJECT_PENDING_CLASS = "created-live-object-card--pending";
export const CREATED_LIVE_OBJECT_SETTLED_CLASS = "created-live-object-card--settled";
export const CREATED_LIVE_OBJECT_PUBLISH_PULSE_CLASS =
  "created-live-object-card--publish-pulse";
export const CREATED_LIVE_OBJECT_SETTLE_PULSE_CLASS =
  "created-live-object-card--settle-pulse";
export const CREATED_LIVE_ARRIVE_VISIBLE_CLASS = "created-live-arrive-item--visible";

/**
 * @param {number} itemCount
 */
export function createdLiveObjectArriveSequenceMs(itemCount) {
  const staggerTotal = Math.max(0, itemCount) * CREATED_LIVE_OBJECT_ROW_STAGGER_MS;
  return CREATED_LIVE_OBJECT_MIN_ARRIVE_MS + staggerTotal + CREATED_LIVE_OBJECT_SETTLE_MS;
}

/**
 * @param {string | null | undefined} cardStatusText
 */
export function createdLiveObjectStatusChipLabel(cardStatusText) {
  const t = cardStatusText?.trim().toLowerCase();
  if (!t || t === "-" || t === ", ") return null;
  if (t === "active" || t === "reachable") return "Active";
  if (t === "revoked") return "Revoked";
  if (t === "expired") return "Expired";
  return cardStatusText.trim();
}

/**
 * Thanks mint activation copy + timing (Register A transition beat).
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Beat 4
 */

export const THANKS_ACTIVATION_EYEBROW = "Tier 1 · activated";

export const THANKS_ACTIVATION_HEADLINE = "Your print QR is live";

export const THANKS_ACTIVATION_LEAD =
  "Production can continue. Update what strangers read before your item arrives.";

export const THANKS_ACTIVATION_CTA_LABEL = "Update what scanners see";

export const THANKS_ACTIVATION_CTA_HREF = "/created/#update-status";

export const THANKS_ACTIVATION_MIN_ARRIVE_MS = 320;

export const THANKS_ACTIVATION_ROW_STAGGER_MS = 80;

export const THANKS_ACTIVATION_SETTLE_MS = 520;

export const THANKS_ACTIVATION_PENDING_CLASS = "shop-thanks-activation-card--pending";
export const THANKS_ACTIVATION_SETTLED_CLASS = "shop-thanks-activation-card--settled";
export const THANKS_ACTIVATION_SETTLE_PULSE_CLASS =
  "shop-thanks-activation-card--settle-pulse";
export const THANKS_ACTIVATION_ARRIVE_VISIBLE_CLASS = "shop-thanks-arrive-item--visible";

/**
 * @param {{ status?: string } | null | undefined} mint
 * @param {boolean} tier1Thanks
 */
export function shouldShowThanksActivation(mint, tier1Thanks) {
  if (!tier1Thanks) return false;
  return mint?.status === "complete";
}

/**
 * @param {number} itemCount
 */
export function thanksActivationArriveSequenceMs(itemCount) {
  const staggerTotal = Math.max(0, itemCount) * THANKS_ACTIVATION_ROW_STAGGER_MS;
  return THANKS_ACTIVATION_MIN_ARRIVE_MS + staggerTotal + THANKS_ACTIVATION_SETTLE_MS;
}

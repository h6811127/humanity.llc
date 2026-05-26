/** Shop UI copy — pending vs open checkout (see docs/PRODUCTION_SAD_PATH_QA_2026-05-26.md P1-2). */

export const SHOP_CHECKOUT_PENDING_LABEL = "Checkout opening soon";

export const SHOP_CHECKOUT_READY_LEAD =
  "Ready to order. You will complete payment on Shopify's secure checkout — then return here for what to expect when the sticker ships.";

/**
 * @param {string | null | undefined} priceDisplay
 */
export function shopPriceLabelWhenCheckoutClosed(priceDisplay) {
  const price = typeof priceDisplay === "string" && priceDisplay.trim() ? priceDisplay.trim() : null;
  return price ? `${price} · checkout soon` : SHOP_CHECKOUT_PENDING_LABEL;
}

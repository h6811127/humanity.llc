/** Shop UI copy — pending vs open checkout (see docs/PRODUCTION_SAD_PATH_QA_2026-05-26.md P1-2). */

export const SHOP_CHECKOUT_PENDING_LABEL = "Checkout opening soon";

export const SHOP_CHECKOUT_READY_LEAD =
  "Ready to order. Continue to Shopify's secure checkout in this tab — then return here for what to expect when your order ships.";

export const SHOP_CHECKOUT_REDIRECT_STATUS = "Redirecting to secure checkout…";

export const SHOP_CHECKOUT_AFTER_REDIRECT_STATUS =
  "Complete payment on Shopify, then return here for what to expect.";

/**
 * @param {string | null | undefined} priceDisplay
 */
export function shopPriceLabelWhenCheckoutClosed(priceDisplay) {
  const price = typeof priceDisplay === "string" && priceDisplay.trim() ? priceDisplay.trim() : null;
  return price ? `${price} · checkout soon` : SHOP_CHECKOUT_PENDING_LABEL;
}

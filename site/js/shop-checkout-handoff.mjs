/**
 * Same-tab Shopify checkout handoff — premium UX vs window.open new tab.
 * See docs/MERCH_FUNNEL_MVP.md § Premium UX principles.
 */

/**
 * @param {string} url
 */
export function isAllowedCheckoutUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Navigate to Shopify checkout in the same tab.
 * @param {string} url
 * @param {{ assign?: (href: string) => void }} [navigation]
 */
export function goToShopifyCheckout(url, navigation = globalThis.location) {
  const href = typeof url === "string" ? url.trim() : "";
  if (!isAllowedCheckoutUrl(href)) {
    throw new Error("Checkout URL is not available yet.");
  }
  if (typeof navigation?.assign === "function") {
    navigation.assign(href);
    return;
  }
  throw new Error("Checkout navigation unavailable.");
}

/**
 * Intercept anchor clicks for validated same-tab checkout.
 * @param {HTMLAnchorElement | null | undefined} anchor
 * @param {() => string} getUrl
 * @param {() => boolean} [canProceed]
 */
export function bindSameTabCheckoutAnchor(anchor, getUrl, canProceed = () => true) {
  if (!anchor) return;
  anchor.removeAttribute("target");
  anchor.removeAttribute("rel");
  anchor.addEventListener("click", (event) => {
    if (!canProceed()) {
      event.preventDefault();
      return;
    }
    const href = getUrl();
    if (!isAllowedCheckoutUrl(href)) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    goToShopifyCheckout(href);
  });
}

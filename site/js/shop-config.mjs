/**
 * Tier 0 shop config — operator sets checkout in site/data/shop-config.json.
 * See docs/SHOP_TIER0_IMPLEMENTATION.md.
 */

let cached = null;

export async function loadShopConfig() {
  if (cached) return cached;
  const res = await fetch("/data/shop-config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Shop config unavailable");
  cached = await res.json();
  return cached;
}

/**
 * @param {Record<string, unknown>} config
 */
export function isTier0CheckoutOpen(config) {
  const tier0 = config?.tier0;
  if (!tier0 || tier0.checkout_open !== true) return false;
  const url = typeof tier0.checkout_url === "string" ? tier0.checkout_url.trim() : "";
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} config
 */
export function tier0Display(config) {
  const tier0 = config?.tier0 ?? {};
  return {
    title: typeof tier0.product_title === "string" ? tier0.product_title : "Founding signal sticker",
    price:
      typeof tier0.price_display === "string" && tier0.price_display.trim()
        ? tier0.price_display.trim()
        : null,
    checkoutUrl: typeof tier0.checkout_url === "string" ? tier0.checkout_url.trim() : "",
  };
}

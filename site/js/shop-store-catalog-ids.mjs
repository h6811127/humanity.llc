/** Shared storefront product paths (mirrors worker store-catalog). */

export const TIER0_FOUNDING_STORE_PRODUCT_ID = "tier0_founding_sticker_v1";
export const TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID = "tier0_glitch_hoodie_v1";

const TIER0_IDS = new Set([
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
]);

/**
 * @param {string} productId
 */
export function isTier0StoreProductId(productId) {
  return TIER0_IDS.has(String(productId ?? "").trim());
}

/**
 * @param {string} productId
 */
export function storeProductDetailPath(productId) {
  const id = typeof productId === "string" ? productId.trim() : "";
  if (!id) return "/shop/";
  return `/shop/products/${encodeURIComponent(id)}/`;
}

/**
 * @param {Record<string, unknown>} product
 */
export function storeProductActionPath(product) {
  const productId = String(product.product_id ?? "");
  if (productId === TIER0_FOUNDING_STORE_PRODUCT_ID) {
    return "/shop/founding/";
  }
  if (product.product_class === "personalized") {
    return `/shop/customize/?product=${encodeURIComponent(productId)}`;
  }
  if (typeof product.action_path === "string" && product.action_path.trim()) {
    return product.action_path.trim();
  }
  return storeProductDetailPath(productId);
}

/**
 * Product detail page helpers — SF-001 product detail.
 * See docs/features/Storefront v1.0.md § 5.4.
 */

import {
  productAvailabilityLabel,
  resolveProductAvailability,
  resolveProductPriceDisplay,
} from "./shop-store-rows-core.mjs";
import {
  storeProductActionPath,
  storeProductDetailPath,
  TIER0_FOUNDING_STORE_PRODUCT_ID,
} from "./shop-store-catalog-ids.mjs";
import { shopPriceLabelWhenCheckoutClosed } from "./shop-copy-core.mjs";

/**
 * @param {string} [pathname]
 */
export function readProductIdFromPath(pathname = globalThis.location?.pathname ?? "") {
  const path = typeof pathname === "string" ? pathname : "";
  const match = path.match(/\/shop\/products\/([^/?#]+)\/?$/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  try {
    const params = new URL(path, "https://humanity.llc").searchParams;
    const queryId = params.get("product_id")?.trim();
    return queryId || null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Record<string, unknown>} product
 */
export function enrichProductDetail(config, catalogPayload, product) {
  const availability = resolveProductAvailability(config, catalogPayload, product);
  const priceDisplay = resolveProductPriceDisplay(config, product);
  return {
    ...product,
    availability,
    price_display: priceDisplay,
    action_path: storeProductActionPath(product),
    detail_path:
      typeof product.detail_path === "string" && product.detail_path.trim()
        ? product.detail_path.trim()
        : storeProductDetailPath(String(product.product_id ?? "")),
  };
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailRowLabel(product) {
  const rowIds = Array.isArray(product.row_ids) ? product.row_ids : [];
  if (rowIds.includes("row_founding")) return "Founding objects";
  if (rowIds.includes("row_personalize")) return "Make it yours";
  return "Shop";
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailPriceLabel(product) {
  if (product.availability === "checkout" && product.price_display) {
    return String(product.price_display);
  }
  if (product.price_display) {
    return shopPriceLabelWhenCheckoutClosed(String(product.price_display));
  }
  return productAvailabilityLabel(product);
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailActionLabel(product) {
  const productId = String(product.product_id ?? "");
  if (product.availability === "checkout") {
    if (productId === TIER0_FOUNDING_STORE_PRODUCT_ID) return "Continue to order";
    if (product.product_class === "personalized") return "Customize and checkout";
    return "Continue to checkout";
  }
  if (product.availability === "preview") {
    return product.product_class === "personalized" ? "Preview your QR" : "View product";
  }
  return "Coming soon";
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailActionEnabled(product) {
  return product.availability === "checkout" || product.availability === "preview";
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailShowsPersistenceWarning(product) {
  return product.supports_personalization === true || product.product_class === "personalized";
}

/**
 * @param {Record<string, unknown>} product
 */
export function productDetailShowsCardRequirement(product) {
  return product.requires_card === true;
}

export { storeProductDetailPath, storeProductActionPath };

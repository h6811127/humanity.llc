/**
 * Tier 0 / company campaign merch — shared batch QR products in shop-config.
 * @see docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md
 */

import {
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
  isTier0StoreProductId,
} from "./shop-store-catalog-ids.mjs";

export {
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  TIER0_GLITCH_HOODIE_STORE_PRODUCT_ID,
  isTier0StoreProductId,
};

/**
 * @param {unknown} raw
 */
function trimString(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * @param {Record<string, unknown>} entry
 */
function normalizeTier0Product(entry) {
  const product_id = trimString(entry.product_id);
  if (!product_id) return null;

  return {
    product_id,
    title: trimString(entry.title) || "Founding object",
    price_display:
      typeof entry.price_display === "string" && entry.price_display.trim()
        ? entry.price_display.trim()
        : null,
    checkout_url: trimString(entry.checkout_url),
    checkout_open: entry.checkout_open === true,
    shopify_variant_id: trimString(entry.shopify_variant_id),
    fulfillment: trimString(entry.fulfillment) || "printify_batch",
  };
}

/**
 * Legacy single `tier0` block → founding sticker product.
 * @param {Record<string, unknown>} tier0
 */
function legacyTier0Product(tier0) {
  return {
    product_id: TIER0_FOUNDING_STORE_PRODUCT_ID,
    title: trimString(tier0.product_title) || "Founding signal sticker",
    price_display:
      typeof tier0.price_display === "string" && tier0.price_display.trim()
        ? tier0.price_display.trim()
        : null,
    checkout_url: trimString(tier0.checkout_url),
    checkout_open: tier0.checkout_open === true,
    shopify_variant_id: trimString(tier0.shopify_variant_id),
    fulfillment: "printify_batch",
  };
}

/**
 * @param {Record<string, unknown>} config
 */
export function tier0Products(config) {
  const tier0 = config?.tier0;
  if (!tier0 || typeof tier0 !== "object") return [];

  if (Array.isArray(tier0.products)) {
    /** @type {ReturnType<typeof normalizeTier0Product>[]} */
    const products = [];
    for (const entry of tier0.products) {
      const normalized = normalizeTier0Product(
        entry && typeof entry === "object" ? entry : {}
      );
      if (normalized) products.push(normalized);
    }
    return products;
  }

  return [legacyTier0Product(tier0)];
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} productId
 */
export function tier0ProductById(config, productId) {
  const id = trimString(productId);
  return tier0Products(config).find((product) => product.product_id === id) ?? null;
}

/**
 * @param {Record<string, unknown>} product
 */
export function isTier0ProductCheckoutOpen(product) {
  if (!product?.checkout_open) return false;
  const url = trimString(product.checkout_url);
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
 * @param {string} productId
 */
export function isTier0StoreProductCheckoutOpen(config, productId) {
  const product = tier0ProductById(config, productId);
  return product ? isTier0ProductCheckoutOpen(product) : false;
}

/**
 * @param {Record<string, unknown>} config
 */
export function isAnyTier0CheckoutOpen(config) {
  return tier0Products(config).some((product) => isTier0ProductCheckoutOpen(product));
}

/**
 * @param {Record<string, unknown>} config
 */
export function tier0Display(config) {
  const founding =
    tier0ProductById(config, TIER0_FOUNDING_STORE_PRODUCT_ID) ??
    tier0Products(config)[0] ??
    null;
  if (!founding) {
    return { title: "Founding signal sticker", price: null, checkoutUrl: "" };
  }
  return {
    title: founding.title,
    price: founding.price_display,
    checkoutUrl: founding.checkout_url,
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} productId
 */
export function tier0ProductDisplay(config, productId) {
  const product = tier0ProductById(config, productId);
  if (!product) {
    return { title: "Founding object", price: null, checkoutUrl: "" };
  }
  return {
    title: product.title,
    price: product.price_display,
    checkoutUrl: product.checkout_url,
  };
}

/**
 * @param {Record<string, unknown>} product
 */
export function tier0ProductConfigIssues(product, index = 0) {
  const issues = [];
  const label = product?.product_id ? String(product.product_id) : `tier0.products[${index}]`;

  if (!trimString(product?.checkout_url)) {
    issues.push(`${label}: missing checkout_url (Shopify cart permalink)`);
  } else {
    try {
      const parsed = new URL(trimString(product.checkout_url));
      if (!/^\/cart\/\d+:\d+$/.test(parsed.pathname)) {
        issues.push(
          `${label}: checkout_url should look like https://STORE.myshopify.com/cart/VARIANT_ID:1`
        );
      }
    } catch {
      issues.push(`${label}: invalid checkout_url`);
    }
  }

  if (!trimString(product?.shopify_variant_id)) {
    issues.push(`${label}: missing shopify_variant_id`);
  }

  return issues;
}

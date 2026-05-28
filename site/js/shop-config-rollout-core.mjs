/**
 * Operator rollout validation for site/data/shop-config.json.
 * Used by merch-funnel:rollout:step* scripts and Vitest.
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Operator setup checklist
 */

import { isTier0CheckoutOpen } from "./shop-config.mjs";
import {
  isTier0ProductCheckoutOpen,
  isAnyTier0CheckoutOpen,
  tier0Products,
} from "./shop-tier0-core.mjs";
import {
  isPersonalizeCheckoutReady,
  isPersonalizeProductCheckoutOpen,
  personalizeProducts,
} from "./shop-customize-core.mjs";

/** Approved Tier 1 print templates (must match worker print-catalog). */
export const APPROVED_PRINT_TEMPLATE_IDS = new Set([
  "hc-sticker-square-v1",
  "hc-hoodie-live-object-v1",
]);

const PLACEHOLDER_VARIANT = /^(YOUR_|VARIANT|12345678901234)/i;
const PLACEHOLDER_URL = /YOUR[-_]|example\.com|VARIANT_ID|YOUR-STORE/i;

/**
 * @param {unknown} raw
 * @returns {string}
 */
function trimString(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * @param {string} url
 */
function isValidCheckoutUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
function looksLikeShopifyCartPermalink(url) {
  try {
    return /^\/cart\/\d+:\d+$/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} config
 * @param {{ strictLaunch?: boolean; label?: string }} [options]
 */
export function validateShopConfig(config, options = {}) {
  const { strictLaunch = false, label = "shop-config" } = options;
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!config || typeof config !== "object") {
    return {
      ok: false,
      errors: [`${label}: config must be a JSON object`],
      warnings,
      tier0CheckoutOpen: false,
      launchSkuReady: false,
      launchProductId: null,
    };
  }

  if (typeof config.version !== "number") {
    warnings.push(`${label}: missing numeric version`);
  }

  const siteOrigin = trimString(config.site_origin);
  if (siteOrigin && !isValidCheckoutUrl(siteOrigin)) {
    warnings.push(`${label}: site_origin is not a valid URL`);
  }

  const tier0CheckoutOpen = isAnyTier0CheckoutOpen(config);
  const tier0Catalog = tier0Products(config);
  if (!tier0Catalog.length) {
    warnings.push(`${label}: tier0 has no products (use tier0.products[] or legacy tier0 block)`);
  }
  for (let i = 0; i < tier0Catalog.length; i++) {
    const product = tier0Catalog[i];
    const productId = String(product.product_id);
    if (product.checkout_open && !isTier0ProductCheckoutOpen(product)) {
      errors.push(
        `${label}: ${productId} checkout_open is true but checkout_url is missing or invalid`
      );
    }
    const checkoutUrl = trimString(product.checkout_url);
    if (checkoutUrl && PLACEHOLDER_URL.test(checkoutUrl)) {
      warnings.push(`${label}: ${productId} checkout_url looks like a placeholder`);
    }
    if (checkoutUrl && !looksLikeShopifyCartPermalink(checkoutUrl)) {
      warnings.push(
        `${label}: ${productId} checkout_url is not a Shopify cart permalink (/cart/VARIANT:QTY) — preview/product URLs may still work but cart permalinks are preferred`
      );
    }
    const variantId = trimString(product.shopify_variant_id);
    if (variantId && PLACEHOLDER_VARIANT.test(variantId)) {
      warnings.push(`${label}: ${productId} shopify_variant_id looks like a placeholder`);
    }
    if (variantId && checkoutUrl) {
      const cartMatch = checkoutUrl.match(/\/cart\/(\d+):/);
      if (cartMatch && cartMatch[1] !== variantId) {
        warnings.push(
          `${label}: ${productId} shopify_variant_id (${variantId}) does not match checkout_url variant (${cartMatch[1]})`
        );
      }
    }
  }
  if (config.tier0?.checkout_open === true && !isTier0CheckoutOpen(config)) {
    warnings.push(
      `${label}: legacy tier0.checkout_open is set but founding sticker is not checkout-ready (prefer tier0.products[])`
    );
  }

  const personalizeOpen = config.personalize?.checkout_open === true;
  const launchProductId = trimString(config.personalize?.checkout_product_id) || null;
  const products = personalizeProducts(config);

  if (personalizeOpen && !products.length) {
    errors.push(`${label}: personalize.checkout_open is true but products[] is empty`);
  }

  for (const product of products) {
    const productId = String(product.product_id);
    const templateId = trimString(product.print_template_id);
    if (templateId && !APPROVED_PRINT_TEMPLATE_IDS.has(templateId)) {
      warnings.push(`${label}: ${productId} print_template_id "${templateId}" is not a known Tier 1 template`);
    }

    const variantId = trimString(product.shopify_variant_id);
    const checkoutUrl = trimString(product.checkout_url);

    if (variantId && PLACEHOLDER_VARIANT.test(variantId)) {
      warnings.push(`${label}: ${productId} shopify_variant_id looks like a placeholder`);
    }
    if (checkoutUrl && PLACEHOLDER_URL.test(checkoutUrl)) {
      warnings.push(`${label}: ${productId} checkout_url looks like a placeholder`);
    }
    if (checkoutUrl && !looksLikeShopifyCartPermalink(checkoutUrl)) {
      warnings.push(
        `${label}: ${productId} checkout_url is not a Shopify cart permalink (/cart/VARIANT:QTY)`
      );
    }
    if (variantId && checkoutUrl) {
      const cartMatch = checkoutUrl.match(/\/cart\/(\d+):/);
      if (cartMatch && cartMatch[1] !== variantId) {
        warnings.push(
          `${label}: ${productId} shopify_variant_id (${variantId}) does not match checkout_url variant (${cartMatch[1]})`
        );
      }
    }
  }

  let launchSkuReady = false;
  if (launchProductId) {
    const launchProduct = products.find((p) => String(p.product_id) === launchProductId);
    if (!launchProduct) {
      errors.push(
        `${label}: personalize.checkout_product_id "${launchProductId}" is not in personalize.products[]`
      );
    } else {
      launchSkuReady = isPersonalizeCheckoutReady(config, launchProduct);
      if (personalizeOpen && !launchSkuReady) {
        const msg = `${label}: launch SKU "${launchProductId}" is not checkout-ready (need checkout_url + personalize.checkout_open)`;
        if (strictLaunch) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    }
  } else if (personalizeOpen) {
    warnings.push(`${label}: personalize.checkout_open is true but checkout_product_id is unset`);
  }

  for (const product of products) {
    if (product.checkout_open === false) continue;
    if (isPersonalizeProductCheckoutOpen(product) && !isPersonalizeCheckoutReady(config, product)) {
      warnings.push(
        `${label}: ${String(product.product_id)} has checkout_url but is gated off by checkout_product_id`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    tier0CheckoutOpen,
    launchSkuReady,
    launchProductId,
  };
}

/**
 * Compare deployed config against repo file for drift.
 * @param {Record<string, unknown>} local
 * @param {Record<string, unknown>} remote
 */
export function compareShopConfigDrift(local, remote) {
  /** @type {string[]} */
  const warnings = [];

  const localLaunch = trimString(local?.personalize?.checkout_product_id);
  const remoteLaunch = trimString(remote?.personalize?.checkout_product_id);
  if (localLaunch && remoteLaunch && localLaunch !== remoteLaunch) {
    warnings.push(
      `checkout_product_id drift: repo=${localLaunch} deployed=${remoteLaunch}`
    );
  }

  const localTier0Open = local?.tier0?.checkout_open === true;
  const remoteTier0Open = remote?.tier0?.checkout_open === true;
  if (localTier0Open !== remoteTier0Open) {
    warnings.push(
      `tier0.checkout_open drift: repo=${String(localTier0Open)} deployed=${String(remoteTier0Open)}`
    );
  }

  const localPersonalizeOpen = local?.personalize?.checkout_open === true;
  const remotePersonalizeOpen = remote?.personalize?.checkout_open === true;
  if (localPersonalizeOpen !== remotePersonalizeOpen) {
    warnings.push(
      `personalize.checkout_open drift: repo=${String(localPersonalizeOpen)} deployed=${String(remotePersonalizeOpen)}`
    );
  }

  return warnings;
}

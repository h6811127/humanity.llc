/**
 * Tier 0 shop config  -  operator sets checkout in site/data/shop-config.json.
 * See docs/SHOP_TIER0_IMPLEMENTATION.md.
 */

import { TIER0_FOUNDING_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";
import {
  tier0Display,
  tier0ProductById,
  tier0Products,
  isTier0StoreProductCheckoutOpen,
  isAnyTier0CheckoutOpen,
} from "./shop-tier0-core.mjs";

let cached = null;

function shouldCacheShopConfig() {
  if (typeof location === "undefined") return true;
  const host = location.hostname;
  return host !== "127.0.0.1" && host !== "localhost";
}

export function resetShopConfigCache() {
  cached = null;
}

export async function loadShopConfig() {
  if (typeof globalThis !== "undefined") {
    const host = globalThis.location?.hostname;
    const e2eConfig = globalThis.__HC_E2E_SHOP_CONFIG__;
    if (
      e2eConfig &&
      typeof e2eConfig === "object" &&
      (host === "127.0.0.1" || host === "localhost")
    ) {
      return e2eConfig;
    }
  }
  if (shouldCacheShopConfig() && cached) return cached;
  const res = await fetch("/data/shop-config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Shop config unavailable");
  const config = await res.json();
  if (shouldCacheShopConfig()) cached = config;
  return config;
}

export { tier0Display, tier0ProductById, tier0Products, isTier0StoreProductCheckoutOpen, isAnyTier0CheckoutOpen };

/** Founding sticker page — not other Tier 0 SKUs (e.g. Glitch hoodie). */
export function isTier0CheckoutOpen(config) {
  return isTier0StoreProductCheckoutOpen(config, TIER0_FOUNDING_STORE_PRODUCT_ID);
}

/**
 * @param {Record<string, unknown>} config
 */
export function isPersonalizeCheckoutOpen(config) {
  return config?.personalize?.checkout_open === true;
}

function normalizeSitePath(raw, fallback) {
  const path = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Absolute thanks URL for Shopify order-status redirect (SHOP_TIER0 step 4).
 * @param {Record<string, unknown>} config
 * @param {string} [locationOrigin] — fallback when site_origin unset (local Pages dev)
 */
export function tier0ThanksPageUrl(config, locationOrigin = "") {
  const thanksPath = normalizeSitePath(config?.thanks_path, "/shop/thanks/");
  const configuredOrigin =
    typeof config?.site_origin === "string" ? config.site_origin.trim().replace(/\/$/, "") : "";
  const origin = configuredOrigin || (typeof locationOrigin === "string" ? locationOrigin.trim().replace(/\/$/, "") : "");
  if (!origin) return thanksPath;
  return `${origin}${thanksPath}`;
}

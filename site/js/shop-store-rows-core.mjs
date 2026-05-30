/**
 * Story-row storefront — fetch + merge with shop-config / print catalog (Phase 6).
 * See docs/MERCH_FUNNEL_MVP.md · GET /v1/store/rows.
 */

import { isPersonalizeCheckoutOpen } from "./shop-config.mjs";
import {
  isTier0StoreProductCheckoutOpen,
  tier0ProductById,
} from "./shop-tier0-core.mjs";
import { isTier0StoreProductId } from "./shop-store-catalog-ids.mjs";
import {
  isPersonalizeProductCheckoutOpen,
  personalizeProducts,
} from "./shop-customize-core.mjs";
import {
  personalizableCatalogProducts,
  resolvePersonalizeProducts,
} from "./shop-print-catalog-core.mjs";

/**
 * @param {string} origin
 */
export async function fetchStoreRows(origin) {
  const base = typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
  if (!base) throw new Error("Store rows origin unavailable.");
  const res = await fetch(`${base}/v1/store/rows`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Store rows unavailable.");
  return res.json();
}

/**
 * @param {string} origin
 * @param {string} productId
 */
export async function fetchStoreProduct(origin, productId) {
  const base = typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
  const id = typeof productId === "string" ? productId.trim() : "";
  if (!base || !id) throw new Error("Store product lookup unavailable.");
  const res = await fetch(`${base}/v1/store/products/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errCode = typeof data.error === "string" ? data.error : "";
    const msg =
      typeof data.message === "string"
        ? data.message
        : errCode === "not_found"
          ? "Store catalog API is unavailable — deploy the Worker with GET /v1/store/products routes."
          : errCode === "PRODUCT_NOT_FOUND"
            ? "Unknown or unpublished product."
            : errCode || "Product unavailable.";
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} product
 */
function personalizeProductFromConfig(config, product) {
  const products = personalizeProducts(config);
  return products.find((entry) => String(entry.product_id) === String(product.product_id)) ?? null;
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Record<string, unknown>} product
 */
export function resolveProductAvailability(config, catalogPayload, product) {
  const productId = String(product.product_id ?? "");
  if (isTier0StoreProductId(productId)) {
    return isTier0StoreProductCheckoutOpen(config, productId) ? "checkout" : "coming_soon";
  }

  const configProduct = personalizeProductFromConfig(config, product);
  if (!configProduct) {
    return product.product_class === "personalized" ? "preview" : "coming_soon";
  }

  const catalogProducts = personalizableCatalogProducts(catalogPayload);
  const merged = resolvePersonalizeProducts(config, { products: catalogProducts });
  const inCatalog = merged.some((entry) => String(entry.product_id) === productId);
  if (!inCatalog) return "coming_soon";

  if (
    isPersonalizeCheckoutOpen(config) &&
    isPersonalizeProductCheckoutOpen(configProduct) &&
    (config.personalize?.checkout_product_id
      ? String(config.personalize.checkout_product_id) === productId
      : true)
  ) {
    return "checkout";
  }

  return "preview";
}

/**
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} product
 */
export function resolveProductPriceDisplay(config, product) {
  const productId = String(product.product_id ?? "");
  if (isTier0StoreProductId(productId)) {
    const tier0 = tier0ProductById(config, productId);
    return tier0?.price_display || product.price_display || null;
  }

  const configProduct = personalizeProductFromConfig(config, product);
  if (configProduct && typeof configProduct.price_display === "string") {
    return configProduct.price_display.trim() || product.price_display || null;
  }

  return typeof product.price_display === "string" ? product.price_display : null;
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function enrichStoreRows(config, catalogPayload, rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const products = Array.isArray(row.products) ? row.products : [];
    return {
      ...row,
      products: products.map((product) => ({
        ...product,
        price_display: resolveProductPriceDisplay(config, product),
        availability: resolveProductAvailability(config, catalogPayload, product),
      })),
    };
  });
}

/**
 * @param {Record<string, unknown>} product
 */
export function productAvailabilityLabel(product) {
  switch (product.availability) {
    case "checkout":
      return "Checkout live";
    case "preview":
      return "Preview live · checkout opening soon";
    default:
      return "Coming soon";
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function rowAggregateStatus(row) {
  const products = Array.isArray(row.products) ? row.products : [];
  if (!products.length) return { label: "Opening soon", live: false };

  const checkoutCount = products.filter((product) => product.availability === "checkout").length;
  const previewCount = products.filter((product) => product.availability === "preview").length;

  if (checkoutCount > 0) {
    return {
      label:
        checkoutCount === products.length
          ? "Preview and checkout live"
          : `${checkoutCount} of ${products.length} products · checkout live`,
      live: true,
    };
  }
  if (previewCount > 0) {
    const countLabel = products.length === 1 ? "1 product" : `${products.length} products`;
    return {
      label: `Preview live · ${countLabel} in approved catalog · checkout opening soon`,
      live: false,
    };
  }
  return { label: "Opening soon", live: false };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Record<string, unknown>} product
 */
export function renderProductCardHtml(product) {
  const kicker = escapeHtml(product.personalization_indicator || "Product");
  const title = escapeHtml(product.title || "Product");
  const meaning = product.meaning_line ? `<p class="shop-lead shop-lead-muted">${escapeHtml(product.meaning_line)}</p>` : "";
  const price = product.price_display
    ? `<p class="shop-product-price shop-hub-price${product.availability === "checkout" ? " shop-product-price--live" : ""}">${escapeHtml(product.price_display)}</p>`
    : "";
  const statusClass =
    product.availability === "checkout" ? " shop-hub-status--live" : "";
  const status = `<p class="shop-hub-status${statusClass}">${escapeHtml(productAvailabilityLabel(product))}</p>`;
  const detailPath = escapeHtml(
    product.action_path || product.detail_path || "/shop/"
  );
  const cta = escapeHtml(product.cta_label || "View product");

  return `<article class="shop-hub-card">
    <p class="shop-product-kicker">${kicker}</p>
    <p class="shop-hub-card-title"><strong>${title}</strong></p>
    ${meaning}
    ${price}
    ${status}
    <a class="btn-primary shop-hub-cta" href="${detailPath}">${cta}</a>
  </article>`;
}

/**
 * @param {Record<string, unknown>} row
 */
export function renderStoryRowHtml(row) {
  const rowId = escapeHtml(row.row_id || "row");
  const title = escapeHtml(row.title || "Collection");
  const story = row.story ? `<p class="shop-lead">${escapeHtml(row.story)}</p>` : "";
  const products = Array.isArray(row.products) ? row.products : [];
  const cards = products.map((product) => renderProductCardHtml(product)).join("\n");

  return `<section class="shop-story-row" id="shop-row-${rowId}" aria-labelledby="shop-row-${rowId}-title">
    <h2 class="group-label" id="shop-row-${rowId}-title">${title}</h2>
    ${story}
    ${cards}
  </section>`;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function renderStoreRowsHtml(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";
  return rows.map((row) => renderStoryRowHtml(row)).join("\n");
}

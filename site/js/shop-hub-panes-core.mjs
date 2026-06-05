/**
 * Full-screen shop product panes — intro + story-row SKUs on /shop/.
 * See site/shop/index.html · GET /v1/store/rows enrichment via shop-store-rows-core.
 */

import {
  FOUNDING_PURSE_STORE_PRODUCT_ID,
  GLITCH_HOODIE_STORE_PRODUCT_ID,
  TIER0_FOUNDING_STORE_PRODUCT_ID,
  storeProductActionPath,
} from "./shop-store-catalog-ids.mjs";
import {
  productAvailabilityLabel,
  resolveProductAvailability,
  resolveProductPriceDisplay,
} from "./shop-store-rows-core.mjs";

export const SHOP_FEATURE_PRODUCT_ID = GLITCH_HOODIE_STORE_PRODUCT_ID;
export const SHOP_PURSE_PRODUCT_ID = FOUNDING_PURSE_STORE_PRODUCT_ID;
export const SHOP_STICKER_PRODUCT_ID = TIER0_FOUNDING_STORE_PRODUCT_ID;

/** @typedef {{
 *   product_id: string;
 *   pane_id: string;
 *   dom_prefix: string;
 *   eyebrow: string;
 *   title: string;
 *   personalization_indicator: string;
 *   meaning_line: string;
 *   hero_image_src: string;
 *   hero_image_width: number;
 *   hero_image_height: number;
 *   hero_bg_class?: string;
 *   hero_object_position: string;
 *   price_display: string;
 *   cta_label: string;
 *   action_path: string;
 *   product_class?: string;
 * }} ShopProductPaneDef */

/** @type {ShopProductPaneDef} */
export const SHOP_FEATURE_PANE = {
  product_id: SHOP_FEATURE_PRODUCT_ID,
  pane_id: "shop-feature-pane",
  dom_prefix: "shop-feature",
  eyebrow: "Founding drop",
  title: "Glitch LIVE QR hoodie",
  personalization_indicator: "Personalized QR",
  meaning_line: "Founding Glitch art on your chest. Your unique QR, your live line.",
  hero_image_src: "/images/landing/navy-glitch-hoodie-transparent-back.jpg",
  hero_image_width: 600,
  hero_image_height: 600,
  hero_bg_class: "shop-pane__bg--feature",
  hero_object_position: "center 38%",
  price_display: "$98 + shipping",
  cta_label: "Customize Glitch hoodie",
  action_path: `/shop/customize/?product=${encodeURIComponent(SHOP_FEATURE_PRODUCT_ID)}`,
};

/** @type {ShopProductPaneDef} */
export const SHOP_PURSE_PANE = {
  product_id: SHOP_PURSE_PRODUCT_ID,
  pane_id: "shop-purse-pane",
  dom_prefix: "shop-purse",
  eyebrow: "Next founding drop",
  title: "Founding LIVE OBJECT purse",
  personalization_indicator: "Personalized QR",
  meaning_line:
    "The 2023 prototype satchel with a unique QR on the front panel. Preview your live line before checkout opens.",
  hero_image_src: "/images/merch/founding-purse/front-styled.png",
  hero_image_width: 640,
  hero_image_height: 640,
  hero_bg_class: "shop-pane__bg--purse",
  hero_object_position: "center 42%",
  price_display: "Preview · price at launch",
  cta_label: "Preview founding purse",
  action_path: `/shop/customize/?product=${encodeURIComponent(SHOP_PURSE_PRODUCT_ID)}`,
};

/** @type {ShopProductPaneDef} */
export const SHOP_STICKER_PANE = {
  product_id: SHOP_STICKER_PRODUCT_ID,
  pane_id: "shop-sticker-pane",
  dom_prefix: "shop-sticker",
  eyebrow: "Founding objects",
  title: "Founding signal sticker",
  personalization_indicator: "Limited Drop",
  meaning_line:
    "Kiss-cut vinyl with a batch campaign QR. Curiosity, not a passport. No card required to order when checkout opens.",
  hero_image_src: "/images/merch/founding-sticker/on-laptop.jpg",
  hero_image_width: 640,
  hero_image_height: 427,
  hero_bg_class: "shop-pane__bg--sticker",
  hero_object_position: "center 45%",
  price_display: "Preview only",
  cta_label: "Preview founding sticker",
  action_path: "/shop/founding/",
  product_class: "limited_drop",
};

/** @type {ShopProductPaneDef[]} */
export const SHOP_PRODUCT_PANES = [SHOP_FEATURE_PANE, SHOP_PURSE_PANE, SHOP_STICKER_PANE];

export const SHOP_PANE_PRODUCT_IDS = SHOP_PRODUCT_PANES.map((pane) => pane.product_id);

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} productId
 */
export function findProductInStoreRows(rows, productId) {
  const id = String(productId ?? "").trim();
  if (!id || !Array.isArray(rows)) return null;
  for (const row of rows) {
    const products = Array.isArray(row.products) ? row.products : [];
    const match = products.find((product) => String(product.product_id ?? "") === id);
    if (match) return match;
  }
  return null;
}

/**
 * @param {ShopProductPaneDef} paneDef
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function resolveProductPane(paneDef, config, catalogPayload, rows) {
  const fromRows = findProductInStoreRows(rows, paneDef.product_id);
  const seed = { ...paneDef, ...(fromRows ?? {}) };
  const availability = resolveProductAvailability(config, catalogPayload, seed);
  return {
    ...seed,
    price_display: resolveProductPriceDisplay(config, seed) ?? paneDef.price_display,
    availability,
    action_path: storeProductActionPath(seed),
    cta_label:
      typeof seed.cta_label === "string" && seed.cta_label.trim()
        ? seed.cta_label.trim()
        : paneDef.cta_label,
    meaning_line:
      typeof seed.meaning_line === "string" && seed.meaning_line.trim()
        ? seed.meaning_line.trim()
        : paneDef.meaning_line,
    title:
      typeof seed.title === "string" && seed.title.trim() ? seed.title.trim() : paneDef.title,
    personalization_indicator:
      typeof seed.personalization_indicator === "string" &&
      seed.personalization_indicator.trim()
        ? seed.personalization_indicator.trim()
        : paneDef.personalization_indicator,
  };
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function resolveFeaturePaneProduct(config, catalogPayload, rows) {
  return resolveProductPane(SHOP_FEATURE_PANE, config, catalogPayload, rows);
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function resolvePursePaneProduct(config, catalogPayload, rows) {
  return resolveProductPane(SHOP_PURSE_PANE, config, catalogPayload, rows);
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function resolveStickerPaneProduct(config, catalogPayload, rows) {
  return resolveProductPane(SHOP_STICKER_PANE, config, catalogPayload, rows);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string | string[]} productIds
 */
export function filterProductFromStoreRows(rows, productIds) {
  const ids = new Set(
    (Array.isArray(productIds) ? productIds : [productIds])
      .map((id) => String(id ?? "").trim())
      .filter(Boolean)
  );
  if (!ids.size || !Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const products = Array.isArray(row.products) ? row.products : [];
      const filtered = products.filter((product) => !ids.has(String(product.product_id ?? "")));
      if (filtered.length === products.length) return row;
      return { ...row, products: filtered };
    })
    .filter((row) => {
      const products = Array.isArray(row.products) ? row.products : [];
      return products.length > 0;
    });
}

/**
 * @param {Record<string, unknown>} product
 */
export function featurePaneStatusClass(product) {
  return product.availability === "checkout" ? " shop-pane__status--live" : "";
}

/**
 * @param {Record<string, unknown>} product
 */
export function featurePanePriceClass(product) {
  return product.availability === "checkout" ? " shop-pane__price--live" : "";
}

/**
 * @param {ShopProductPaneDef} paneDef
 * @param {Record<string, unknown>} product
 * @param {Document} [doc]
 */
export function applyProductPane(paneDef, product, doc = document) {
  const pane = doc.getElementById(paneDef.pane_id);
  if (!pane) return;

  const prefix = paneDef.dom_prefix;
  const badgeEl = doc.getElementById(`${prefix}-badge`);
  const leadEl = doc.getElementById(`${prefix}-lead`);
  const priceEl = doc.getElementById(`${prefix}-price`);
  const statusEl = doc.getElementById(`${prefix}-status`);
  const ctaEl = doc.getElementById(`${prefix}-cta`);
  const titleEl = doc.getElementById(`${prefix}-title`);

  if (titleEl && product.title) titleEl.textContent = String(product.title);
  if (badgeEl && product.personalization_indicator) {
    badgeEl.textContent = String(product.personalization_indicator);
  }
  if (leadEl && product.meaning_line) leadEl.textContent = String(product.meaning_line);

  if (priceEl) {
    priceEl.textContent =
      typeof product.price_display === "string" && product.price_display.trim()
        ? product.price_display.trim()
        : paneDef.price_display;
    priceEl.className = `shop-pane__price${featurePanePriceClass(product)}`;
  }

  if (statusEl) {
    statusEl.textContent = productAvailabilityLabel(product);
    statusEl.className = `shop-pane__status${featurePaneStatusClass(product)}`;
  }

  if (ctaEl) {
    ctaEl.href =
      typeof product.action_path === "string" && product.action_path.trim()
        ? product.action_path.trim()
        : paneDef.action_path;
    ctaEl.textContent =
      typeof product.cta_label === "string" && product.cta_label.trim()
        ? product.cta_label.trim()
        : paneDef.cta_label;
  }
}

/**
 * @param {Record<string, unknown>} product
 * @param {Document} [doc]
 */
export function applyFeaturePaneProduct(product, doc = document) {
  applyProductPane(SHOP_FEATURE_PANE, product, doc);
}

/**
 * @param {Record<string, unknown>} product
 * @param {Document} [doc]
 */
export function applyPursePaneProduct(product, doc = document) {
  applyProductPane(SHOP_PURSE_PANE, product, doc);
}

/**
 * @param {Record<string, unknown>} product
 * @param {Document} [doc]
 */
export function applyStickerPaneProduct(product, doc = document) {
  applyProductPane(SHOP_STICKER_PANE, product, doc);
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 * @param {Document} [doc]
 */
export function hydrateProductPanes(config, catalogPayload, rows, doc = document) {
  for (const paneDef of SHOP_PRODUCT_PANES) {
    applyProductPane(paneDef, resolveProductPane(paneDef, config, catalogPayload, rows), doc);
  }
}

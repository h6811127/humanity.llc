/**
 * Landing `#landing-live-object-carriers` — featured SKU from shop-config.
 * @see docs/MERCH_VISUAL_CHOREOGRAPHY.md § Landing carriers row
 */

import { personalizeProducts } from "./shop-customize-core.mjs";
import { GLITCH_HOODIE_STORE_PRODUCT_ID } from "./shop-store-catalog-ids.mjs";
import {
  SHOP_FEATURE_PANE,
  SHOP_PRODUCT_PANES,
  resolveProductPane,
} from "./shop-hub-panes-core.mjs";
import { productAvailabilityLabel } from "./shop-store-rows-core.mjs";

export const LANDING_CARRIERS_SUBTITLE_BASE =
  "Unique QR on fabric — preview before checkout";

export const LANDING_CARRIERS_DEFAULT_PRODUCT_ID = GLITCH_HOODIE_STORE_PRODUCT_ID;

/**
 * @param {Record<string, unknown>} config
 */
export function resolveLandingFeaturedProductId(config) {
  const launch =
    typeof config?.personalize?.checkout_product_id === "string"
      ? config.personalize.checkout_product_id.trim()
      : "";
  return launch || LANDING_CARRIERS_DEFAULT_PRODUCT_ID;
}

/**
 * @param {string} productId
 */
export function shopPaneDefForProductId(productId) {
  const id = String(productId ?? "").trim();
  return SHOP_PRODUCT_PANES.find((pane) => pane.product_id === id) ?? SHOP_FEATURE_PANE;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} productId
 */
export function personalizeConfigProduct(config, productId) {
  const id = String(productId ?? "").trim();
  if (!id) return null;
  return (
    personalizeProducts(config).find((entry) => String(entry.product_id ?? "") === id) ?? null
  );
}

/**
 * @param {string} title
 */
export function landingCarriersShortTitle(title) {
  const raw = String(title ?? "").trim();
  if (!raw) return "Live object carrier";
  return raw
    .replace(/\s+LIVE QR\s+/i, " ")
    .replace(/\s+LIVE OBJECT\s+/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @param {Array<Record<string, unknown>>} rows
 */
export function resolveLandingCarriersProduct(config, catalogPayload, rows) {
  const productId = resolveLandingFeaturedProductId(config);
  if (!personalizeConfigProduct(config, productId)) return null;
  const paneDef = shopPaneDefForProductId(productId);
  return resolveProductPane(paneDef, config, catalogPayload, rows ?? []);
}

/**
 * @param {Record<string, unknown>} resolved
 * @param {import("./shop-hub-panes-core.mjs").ShopProductPaneDef} paneDef
 */
function landingCarriersImageAlt(resolved, paneDef) {
  const short = landingCarriersShortTitle(resolved.title ?? paneDef.title);
  return `${short} — founding drop carrier`;
}

/**
 * @param {Record<string, unknown>} product
 */
export function landingCarriersStatusClass(product) {
  return product.availability === "checkout"
    ? " landing-carriers-feature-status--live"
    : "";
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} [catalogPayload]
 * @param {Array<Record<string, unknown>>} [rows]
 */
export function buildLandingCarriersViewModel(config, catalogPayload = null, rows = []) {
  const resolved = resolveLandingCarriersProduct(config, catalogPayload, rows);
  if (!resolved) return null;

  const paneDef = shopPaneDefForProductId(resolveLandingFeaturedProductId(config));
  const price =
    typeof resolved.price_display === "string" && resolved.price_display.trim()
      ? resolved.price_display.trim()
      : null;
  const subtitle = price
    ? `${LANDING_CARRIERS_SUBTITLE_BASE} · ${price}`
    : LANDING_CARRIERS_SUBTITLE_BASE;
  const availabilityLabel = productAvailabilityLabel(resolved);

  return {
    productId: String(resolved.product_id ?? resolveLandingFeaturedProductId(config)),
    shortTitle: landingCarriersShortTitle(resolved.title ?? paneDef.title),
    subtitle,
    availability: resolved.availability ?? null,
    availabilityLabel,
    availabilityClass: landingCarriersStatusClass(resolved),
    ctaLabel:
      typeof resolved.cta_label === "string" && resolved.cta_label.trim()
        ? resolved.cta_label.trim()
        : paneDef.cta_label,
    actionPath:
      typeof resolved.action_path === "string" && resolved.action_path.trim()
        ? resolved.action_path.trim()
        : paneDef.action_path,
    imageSrc:
      typeof resolved.hero_image_src === "string" && resolved.hero_image_src.trim()
        ? resolved.hero_image_src.trim()
        : paneDef.hero_image_src,
    imageAlt: landingCarriersImageAlt(resolved, paneDef),
    imageWidth: paneDef.hero_image_width,
    imageHeight: paneDef.hero_image_height,
  };
}

/**
 * @param {HTMLElement} section
 * @param {NonNullable<ReturnType<typeof buildLandingCarriersViewModel>>} model
 */
export function applyLandingCarriersViewModel(section, model) {
  if (!section || !model) return;

  const link = section.querySelector(".landing-carriers-feature");
  const titleEl = section.querySelector(".landing-carriers-feature-title");
  const subEl = section.querySelector(".landing-carriers-feature-sub");
  const statusEl = section.querySelector(".landing-carriers-feature-status");
  const ctaEl = section.querySelector(".landing-carriers-feature-cta");
  const img = section.querySelector(".landing-carriers-figure img");

  if (link instanceof HTMLAnchorElement && model.actionPath) {
    link.href = model.actionPath;
  }
  if (titleEl) titleEl.textContent = model.shortTitle;
  if (subEl) subEl.textContent = model.subtitle;
  if (statusEl) {
    statusEl.textContent = model.availabilityLabel ?? "";
    statusEl.className = `landing-carriers-feature-status${model.availabilityClass ?? ""}`;
    statusEl.hidden = !model.availabilityLabel;
  }
  if (ctaEl) ctaEl.textContent = model.ctaLabel;
  if (img instanceof HTMLImageElement) {
    img.src = model.imageSrc;
    img.alt = model.imageAlt;
    if (model.imageWidth) img.width = model.imageWidth;
    if (model.imageHeight) img.height = model.imageHeight;
  }
}

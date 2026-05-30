/**
 * Print catalog merge for /shop/customize/ — approved templates from worker API
 * joined with commerce fields in shop-config.json.
 * See docs/MERCH_FUNNEL_MVP.md Phase 3.
 */

import { personalizeProducts } from "./shop-customize-core.mjs";

export const TIER0_BATCH_PRINT_TEMPLATE_ID = "hc-tier0-sticker-batch-v1";
export const DEFAULT_PRINT_TEMPLATE_ID = "hc-sticker-square-v1";
export const HOODIE_LIVE_OBJECT_TEMPLATE_ID = "hc-hoodie-live-object-v1";
export const GLITCH_HOODIE_TEMPLATE_ID = "hc-glitch-hoodie-v1";

/** @type {Record<string, string>} */
export const DEFAULT_PRINT_TEMPLATE_BY_PRODUCT_ID = {
  glitch_hoodie_v1: GLITCH_HOODIE_TEMPLATE_ID,
  hoodie_live_object_v1: HOODIE_LIVE_OBJECT_TEMPLATE_ID,
  sticker_personalized_v1: DEFAULT_PRINT_TEMPLATE_ID,
};

/**
 * @param {unknown} payload
 * @returns {Array<Record<string, unknown>>}
 */
export function personalizableCatalogProducts(payload) {
  const products = payload?.products;
  if (!Array.isArray(products)) return [];
  return products.filter((product) => {
    if (!product || typeof product.template_id !== "string") return false;
    if (product.template_id === TIER0_BATCH_PRINT_TEMPLATE_ID) return false;
    if (product.personalizable === false) return false;
    const variants = product.variants;
    if (!Array.isArray(variants) || !variants.length) return false;
    return variants.some((variant) => variant && variant.enabled !== false);
  });
}

/**
 * @param {unknown} type
 */
export function previewKindFromCatalogType(type) {
  if (type === "sticker" || type === "card") return "sticker";
  if (type === "hoodie") return "hoodie";
  return "hoodie";
}

/**
 * @param {Record<string, unknown>} configProduct
 */
export function resolvePrintTemplateId(configProduct) {
  const explicit =
    typeof configProduct.print_template_id === "string"
      ? configProduct.print_template_id.trim()
      : "";
  if (explicit) return explicit;
  const productId =
    typeof configProduct.product_id === "string" ? configProduct.product_id.trim() : "";
  return DEFAULT_PRINT_TEMPLATE_BY_PRODUCT_ID[productId] ?? "";
}

/**
 * @param {Record<string, unknown>} config
 * @param {Array<Record<string, unknown>>} catalogProducts
 * @returns {Array<Record<string, unknown>>}
 */
export function mergePersonalizeWithCatalog(config, catalogProducts) {
  const configProducts = personalizeProducts(config);
  if (!catalogProducts.length) return configProducts;

  const catalogByTemplate = new Map(
    catalogProducts.map((product) => [String(product.template_id), product])
  );

  /** @type {Array<Record<string, unknown>>} */
  const merged = [];
  for (const configProduct of configProducts) {
    const templateId = resolvePrintTemplateId(configProduct);
    const catalogEntry = templateId ? catalogByTemplate.get(templateId) : null;
    if (!catalogEntry) continue;

    const catalogVariants = Array.isArray(catalogEntry.variants) ? catalogEntry.variants : [];
    const enabledVariant = catalogVariants.find((variant) => variant && variant.enabled !== false);
    const configuredVariant =
      typeof configProduct.print_variant_id === "string"
        ? configProduct.print_variant_id.trim()
        : "";
    const printVariantId =
      configuredVariant ||
      (enabledVariant && typeof enabledVariant.variant_id === "string"
        ? enabledVariant.variant_id
        : "");

    merged.push({
      ...configProduct,
      print_template_id: templateId,
      print_variant_id: printVariantId,
      title:
        typeof configProduct.title === "string" && configProduct.title.trim()
          ? configProduct.title.trim()
          : typeof catalogEntry.title === "string"
            ? catalogEntry.title
            : "Personalized item",
      preview:
        configProduct.preview === "sticker" ||
        configProduct.preview === "hoodie" ||
        configProduct.preview === "glitch_hoodie"
          ? configProduct.preview
          : previewKindFromCatalogType(catalogEntry.type),
      catalog_title: catalogEntry.title,
      catalog_description: catalogEntry.description,
      catalog_type: catalogEntry.type,
    });
  }

  return merged;
}

/**
 * @param {Record<string, unknown>} config
 * @param {unknown} catalogPayload
 * @returns {Array<Record<string, unknown>>}
 */
export function resolvePersonalizeProducts(config, catalogPayload) {
  const catalogProducts = personalizableCatalogProducts(catalogPayload);
  const merged = mergePersonalizeWithCatalog(config, catalogProducts);
  return merged.length ? merged : personalizeProducts(config);
}

/**
 * @param {string} origin
 */
export async function fetchPrintCatalog(origin) {
  const base = typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
  if (!base) throw new Error("Print catalog origin unavailable.");
  const res = await fetch(`${base}/v1/print/catalog`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Print catalog unavailable.");
  return res.json();
}

/**
 * @param {Array<Record<string, unknown>>} products
 * @param {URL | Location} [url]
 */
export function readInitialPersonalizeProductId(products, url = globalThis.location) {
  if (!products.length) return null;
  let param = null;
  try {
    param = (url instanceof URL ? url.searchParams : new URL(url.href).searchParams).get("product");
  } catch {
    param = null;
  }
  if (!param) return String(products[0].product_id);

  const normalized = param.trim().toLowerCase();
  if (normalized === "hoodie") {
    const match = products.find((product) => product.preview === "hoodie");
    if (match?.product_id) return String(match.product_id);
  }
  if (normalized === "glitch") {
    const match = products.find(
      (product) => product.preview === "glitch_hoodie" || product.product_id === "glitch_hoodie_v1"
    );
    if (match?.product_id) return String(match.product_id);
  }
  if (normalized === "sticker") {
    const match = products.find((product) => product.preview === "sticker");
    if (match?.product_id) return String(match.product_id);
  }

  const direct = products.find((product) => String(product.product_id) === param);
  return direct?.product_id ? String(direct.product_id) : String(products[0].product_id);
}

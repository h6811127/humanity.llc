/**
 * Product variant matrix merge — Printify ids + optional Shopify checkout overrides.
 * See site/data/glitch-hoodie-variant-matrix.json · docs/MERCH_HEADLESS_COMMERCE.md
 */

export const GLITCH_HOODIE_VARIANT_MATRIX_URL = "/data/glitch-hoodie-variant-matrix.json";

/** @typedef {{ print_variant_id: string, label: string, color: string, size: string, printify_variant_id: number, shopify_variant_id?: string, checkout_url?: string }} ProductVariant */

/**
 * @param {unknown} payload
 * @returns {Array<Record<string, unknown>>}
 */
export function variantsFromMatrixPayload(payload) {
  const variants = payload?.variants;
  return Array.isArray(variants) ? variants.filter((v) => v && typeof v.print_variant_id === "string") : [];
}

/**
 * @param {Array<Record<string, unknown>>} matrixVariants
 * @param {Array<Record<string, unknown>> | undefined} configOverrides
 * @returns {ProductVariant[]}
 */
export function mergeVariantMatrixWithConfig(matrixVariants, configOverrides) {
  const overrideByKey = new Map();
  for (const row of configOverrides ?? []) {
    if (!row || typeof row.print_variant_id !== "string") continue;
    overrideByKey.set(row.print_variant_id.trim(), row);
  }

  return matrixVariants.map((base) => {
    const key = String(base.print_variant_id).trim();
    const override = overrideByKey.get(key) ?? {};
    const shopifyVariantId =
      typeof override.shopify_variant_id === "string" ? override.shopify_variant_id.trim() : "";
    const checkoutUrl =
      typeof override.checkout_url === "string" ? override.checkout_url.trim() : "";
    return {
      print_variant_id: key,
      label: typeof base.label === "string" ? base.label : key,
      color: typeof base.color === "string" ? base.color : "",
      size: typeof base.size === "string" ? base.size : "",
      printify_variant_id: Number(base.printify_variant_id),
      shopify_variant_id: shopifyVariantId,
      checkout_url: checkoutUrl,
    };
  });
}

/**
 * @param {Record<string, unknown>} product
 * @param {unknown} matrixPayload
 * @returns {ProductVariant[]}
 */
export function resolveProductVariants(product, matrixPayload) {
  const matrixId =
    typeof product.variant_matrix === "string" ? product.variant_matrix.trim() : "";
  if (matrixId !== "glitch_hoodie_v1" && product.product_id !== "glitch_hoodie_v1") {
    return legacySingleVariant(product);
  }
  const matrixVariants = variantsFromMatrixPayload(matrixPayload);
  if (!matrixVariants.length) return legacySingleVariant(product);
  const configOverrides = Array.isArray(product.variants) ? product.variants : [];
  return mergeVariantMatrixWithConfig(matrixVariants, configOverrides);
}

/**
 * @param {Record<string, unknown>} product
 * @returns {ProductVariant[]}
 */
function legacySingleVariant(product) {
  const printVariantId =
    typeof product.print_variant_id === "string" ? product.print_variant_id.trim() : "";
  const shopifyVariantId =
    typeof product.shopify_variant_id === "string" ? product.shopify_variant_id.trim() : "";
  const checkoutUrl = typeof product.checkout_url === "string" ? product.checkout_url.trim() : "";
  if (!printVariantId && !shopifyVariantId && !checkoutUrl) return [];
  return [
    {
      print_variant_id: printVariantId || "default",
      label: typeof product.title === "string" ? product.title : "Default",
      color: "",
      size: "",
      printify_variant_id: 0,
      shopify_variant_id: shopifyVariantId,
      checkout_url: checkoutUrl,
    },
  ];
}

/**
 * @param {ProductVariant | null | undefined} variant
 */
export function variantHasShopifyCheckout(variant) {
  if (!variant) return false;
  const url = variant.checkout_url?.trim() ?? "";
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      /\/cart\/\d+:\d+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * @param {ProductVariant[]} variants
 * @returns {string[]}
 */
export function uniqueVariantColors(variants) {
  return [...new Set(variants.map((v) => v.color).filter(Boolean))];
}

/**
 * @param {ProductVariant[]} variants
 * @param {string} color
 * @returns {string[]}
 */
export function sizesForColor(variants, color) {
  const sizeOrder = ["S", "M", "L", "XL", "2XL", "3XL"];
  const sizes = variants.filter((v) => v.color === color).map((v) => v.size);
  return sizes.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
}

/**
 * @param {ProductVariant[]} variants
 * @param {string} color
 * @param {string} size
 * @returns {ProductVariant | null}
 */
export function findVariantByColorSize(variants, color, size) {
  return variants.find((v) => v.color === color && v.size === size) ?? null;
}

/**
 * @param {ProductVariant[]} variants
 * @param {string} printVariantId
 * @returns {ProductVariant | null}
 */
export function findVariantById(variants, printVariantId) {
  const key = printVariantId?.trim() ?? "";
  if (!key) return null;
  return variants.find((v) => v.print_variant_id === key) ?? null;
}

/**
 * Default color/size for picker — prefer Black / M when present.
 * @param {ProductVariant[]} variants
 */
export function defaultVariantSelection(variants) {
  if (!variants.length) return { color: "", size: "", variant: null };
  const colors = uniqueVariantColors(variants);
  const color = colors.includes("Black") ? "Black" : colors[0];
  const sizes = sizesForColor(variants, color);
  const size = sizes.includes("M") ? "M" : sizes[0];
  return { color, size, variant: findVariantByColorSize(variants, color, size) };
}

/**
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} product
 * @param {ProductVariant | null | undefined} variant
 */
export function isPersonalizeVariantCheckoutReady(config, product, variant) {
  if (product?.checkout_open === false) return false;
  if (config?.personalize?.checkout_open !== true) return false;
  const launchSku =
    typeof config?.personalize?.checkout_product_id === "string"
      ? config.personalize.checkout_product_id.trim()
      : "";
  if (launchSku && String(product?.product_id ?? "") !== launchSku) return false;
  return variantHasShopifyCheckout(variant);
}

/**
 * @param {string} siteOrigin
 * @param {string} printVariantId
 * @param {string} shopifyVariantId
 */
export function buildCheckoutUrlForVariant(siteOrigin, printVariantId, shopifyVariantId) {
  const id = shopifyVariantId?.trim() ?? "";
  if (!id) return "";
  const base =
    typeof siteOrigin === "string" && siteOrigin.trim()
      ? siteOrigin.trim().replace(/\/$/, "")
      : "https://humanity.llc";
  return `${base.replace(/\/$/, "")}/cart/${id}:1`;
}

/**
 * @param {string} url
 */
export async function fetchVariantMatrix(url = GLITCH_HOODIE_VARIANT_MATRIX_URL) {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Variant matrix unavailable.");
  return res.json();
}

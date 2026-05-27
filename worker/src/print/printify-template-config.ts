import {
  DEFAULT_PRINT_TEMPLATE_ID,
  HOODIE_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "./print-catalog";

export interface PrintifyLineItemConfig {
  product_id: string;
  variant_id: number;
  shipping_method: number;
}

export interface PrintifyTemplateEnv {
  TIER0_PRINTIFY_PRODUCT_ID?: string;
  TIER0_PRINTIFY_VARIANT_ID?: string;
  TIER0_PRINTIFY_SHIPPING_METHOD?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD?: string;
  PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID?: string;
  PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_X?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_Y?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_SCALE?: string;
  PERSONALIZE_HOODIE_PRINTIFY_IMAGE_ANGLE?: string;
  PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD?: string;
  PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID?: string;
  PERSONALIZE_STICKER_PRINTIFY_PLACEHOLDER?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_X?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_Y?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_SCALE?: string;
  PERSONALIZE_STICKER_PRINTIFY_IMAGE_ANGLE?: string;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveFromEnv(
  env: PrintifyTemplateEnv,
  productIdKey: keyof PrintifyTemplateEnv,
  variantIdKey: keyof PrintifyTemplateEnv,
  shippingMethodKey: keyof PrintifyTemplateEnv
): PrintifyLineItemConfig | null {
  const product_id = env[productIdKey]?.trim() ?? "";
  const variant_id = parsePositiveInt(env[variantIdKey], 0);
  if (!product_id || variant_id <= 0) return null;
  return {
    product_id,
    variant_id,
    shipping_method: parsePositiveInt(env[shippingMethodKey], 1),
  };
}

/** Resolve Printify product mapping from operator env (no secrets in catalog JSON). */
export function resolvePrintifyLineItem(
  env: PrintifyTemplateEnv,
  templateId: string
): PrintifyLineItemConfig | null {
  if (templateId === TIER0_BATCH_PRINT_TEMPLATE_ID) {
    return resolveFromEnv(
      env,
      "TIER0_PRINTIFY_PRODUCT_ID",
      "TIER0_PRINTIFY_VARIANT_ID",
      "TIER0_PRINTIFY_SHIPPING_METHOD"
    );
  }
  if (templateId === HOODIE_PRINT_TEMPLATE_ID) {
    return resolveFromEnv(
      env,
      "PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID",
      "PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID",
      "PERSONALIZE_HOODIE_PRINTIFY_SHIPPING_METHOD"
    );
  }
  if (templateId === DEFAULT_PRINT_TEMPLATE_ID) {
    return resolveFromEnv(
      env,
      "PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID",
      "PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID",
      "PERSONALIZE_STICKER_PRINTIFY_SHIPPING_METHOD"
    );
  }
  return null;
}

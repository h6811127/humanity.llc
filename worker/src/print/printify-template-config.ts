import {
  DEFAULT_PRINT_TEMPLATE_ID,
  TIER0_BATCH_PRINT_TEMPLATE_ID,
} from "./print-catalog";

export interface PrintifyLineItemConfig {
  product_id: string;
  variant_id: number;
  shipping_method: number;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Resolve Printify product mapping from operator env (no secrets in catalog JSON). */
export function resolvePrintifyLineItem(
  env: {
    TIER0_PRINTIFY_PRODUCT_ID?: string;
    TIER0_PRINTIFY_VARIANT_ID?: string;
    TIER0_PRINTIFY_SHIPPING_METHOD?: string;
    PERSONALIZED_STICKER_PRINTIFY_PRODUCT_ID?: string;
    PERSONALIZED_STICKER_PRINTIFY_VARIANT_ID?: string;
    PERSONALIZED_STICKER_PRINTIFY_SHIPPING_METHOD?: string;
  },
  templateId: string
): PrintifyLineItemConfig | null {
  if (templateId === TIER0_BATCH_PRINT_TEMPLATE_ID) {
    const product_id = env.TIER0_PRINTIFY_PRODUCT_ID?.trim() ?? "";
    const variant_id = parsePositiveInt(env.TIER0_PRINTIFY_VARIANT_ID, 0);
    if (!product_id || variant_id <= 0) return null;
    return {
      product_id,
      variant_id,
      shipping_method: parsePositiveInt(env.TIER0_PRINTIFY_SHIPPING_METHOD, 1),
    };
  }

  if (templateId === DEFAULT_PRINT_TEMPLATE_ID) {
    const product_id = env.PERSONALIZED_STICKER_PRINTIFY_PRODUCT_ID?.trim() ?? "";
    const variant_id = parsePositiveInt(env.PERSONALIZED_STICKER_PRINTIFY_VARIANT_ID, 0);
    if (!product_id || variant_id <= 0) return null;
    return {
      product_id,
      variant_id,
      shipping_method: parsePositiveInt(env.PERSONALIZED_STICKER_PRINTIFY_SHIPPING_METHOD, 1),
    };
  }

  return null;
}

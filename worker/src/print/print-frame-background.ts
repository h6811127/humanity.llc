/**
 * Buyer-selectable print frame background persisted on artifact intents and print orders.
 * Canonical for API validation and fulfillment render overrides — see MERCH_HEADLESS_COMMERCE.md.
 */

import { GLITCH_HOODIE_STORE_PRODUCT_ID } from "./print-catalog";
import { resolveGlitchHoodieVariantColor } from "./glitch-hoodie-variant-matrix";

export const BUYER_PRINT_FRAME_BACKGROUNDS = ["full", "transparent"] as const;

export type BuyerPrintFrameBackground = (typeof BUYER_PRINT_FRAME_BACKGROUNDS)[number];

export const DEFAULT_BUYER_PRINT_FRAME_BACKGROUND: BuyerPrintFrameBackground = "full";

/**
 * @param {unknown} raw
 * @returns {BuyerPrintFrameBackground}
 */
export function normalizeBuyerPrintFrameBackground(raw: unknown): BuyerPrintFrameBackground {
  if (typeof raw === "string" && raw.trim() === "transparent") {
    return "transparent";
  }
  return DEFAULT_BUYER_PRINT_FRAME_BACKGROUND;
}

export function isBuyerPrintFrameBackground(value: string): value is BuyerPrintFrameBackground {
  return (BUYER_PRINT_FRAME_BACKGROUNDS as readonly string[]).includes(value);
}

/** Garment colors where transparent print is blocked (scan reliability). */
export const GLITCH_PRINT_WHITE_CARD_ONLY_COLORS = ["Charcoal Heather", "Royal Blue"] as const;

/**
 * Resolve persisted frame background for artifact intent create/attach.
 * Transparent is only honored for Glitch hoodie when the variant color allows it.
 */
export function resolveArtifactIntentPrintFrameBackground(input: {
  product_id: string | null;
  print_variant_id: string | null;
  print_frame_background?: unknown;
}): BuyerPrintFrameBackground {
  const requested = normalizeBuyerPrintFrameBackground(input.print_frame_background);
  if (requested !== "transparent") return "full";
  if (input.product_id !== GLITCH_HOODIE_STORE_PRODUCT_ID) return "full";
  const color = resolveGlitchHoodieVariantColor(input.print_variant_id);
  if (
    color &&
    (GLITCH_PRINT_WHITE_CARD_ONLY_COLORS as readonly string[]).includes(color)
  ) {
    return "full";
  }
  return "transparent";
}

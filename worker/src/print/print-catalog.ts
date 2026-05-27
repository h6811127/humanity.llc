/** Humanity-approved print templates (not raw Printify catalog). O-002 */

export interface PrintCatalogVariant {
  variant_id: string;
  label: string;
  enabled: boolean;
}

export interface PrintCatalogProduct {
  template_id: string;
  type: "sticker" | "card";
  title: string;
  description: string;
  product_id: string;
  variants: PrintCatalogVariant[];
}

export const DEFAULT_PRINT_TEMPLATE_ID = "hc-sticker-square-v1";

/** Tier 0 founding sticker — shared batch QR artwork; no per-item mint. */
export const TIER0_BATCH_PRINT_TEMPLATE_ID = "hc-tier0-sticker-batch-v1";

const CATALOG: PrintCatalogProduct[] = [
  {
    template_id: TIER0_BATCH_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Founding signal sticker (Tier 0 batch)",
    description:
      "Mass founding sticker with shared campaign QR — no per-order personalization.",
    product_id: "prod_tier0_sticker_batch",
    variants: [
      {
        variant_id: "tier0-batch",
        label: "Tier 0 batch / shared QR",
        enabled: true,
      },
    ],
  },
  {
    template_id: DEFAULT_PRINT_TEMPLATE_ID,
    type: "sticker",
    title: "Humanity QR Sticker",
    description: "Square sticker with signed Humanity QR (2×2 in trim + bleed).",
    product_id: "prod_sticker_square",
    variants: [
      {
        variant_id: "2x2-white",
        label: "2 × 2 in / White",
        enabled: true,
      },
    ],
  },
];

export function getApprovedPrintCatalog(): PrintCatalogProduct[] {
  return CATALOG.map((product) => ({
    ...product,
    variants: product.variants.filter((v) => v.enabled),
  }));
}

export function getPrintCatalogProduct(templateId: string): PrintCatalogProduct | null {
  return getApprovedPrintCatalog().find((p) => p.template_id === templateId) ?? null;
}

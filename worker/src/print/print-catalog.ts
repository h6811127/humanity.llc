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

const CATALOG: PrintCatalogProduct[] = [
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

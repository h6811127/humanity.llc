import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SHOPIFY_COLOR_TO_PRINTIFY,
  buildVariantOverrides,
  mapShopifyRowToPrintVariant,
  parseShopifyExportCsv,
} from "../scripts/import-glitch-shopify-variants.mjs";

const fixturePath = path.join(
  process.cwd(),
  "site/data/fixtures/glitch-hoodie-shopify-export.csv"
);

describe("import-glitch-shopify-variants", () => {
  it("parses 42 variant rows from Shopify export", () => {
    const rows = parseShopifyExportCsv(readFileSync(fixturePath, "utf8"));
    expect(rows).toHaveLength(42);
    expect(rows[0]?.sku).toBe("P2016-BLK-XS");
  });

  it("maps Shopify colors to Printify matrix colors", () => {
    expect(mapShopifyRowToPrintVariant("BLACK", "M")).toEqual({
      print_variant_id: "black-m",
      color: "Black",
      size: "M",
      shopifyColor: "BLACK",
    });
    expect(mapShopifyRowToPrintVariant("GUNMETAL HEATHER", "L")?.print_variant_id).toBe(
      "stone-grey-l"
    );
    expect(mapShopifyRowToPrintVariant("BLACK", "XS")).toBeNull();
  });

  it("covers six Shopify colors; Royal Blue has no Shopify row", () => {
    expect(Object.keys(SHOPIFY_COLOR_TO_PRINTIFY)).toHaveLength(6);
    const rows = parseShopifyExportCsv(readFileSync(fixturePath, "utf8"));
    const { report } = buildVariantOverrides(rows, new Map(), "humanity-llc.myshopify.com");
    expect(report.mapped).toHaveLength(36);
    expect(report.skippedSize).toHaveLength(6);
    expect(report.shopifyUnmapped.some((v) => v.color === "Royal Blue")).toBe(true);
  });
});

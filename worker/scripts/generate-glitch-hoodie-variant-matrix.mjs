/**
 * Export Printify variant matrix for glitch_hoodie_v1.
 *
 *   PRINTIFY_API_TOKEN=… node worker/scripts/generate-glitch-hoodie-variant-matrix.mjs
 *
 * Writes:
 *   site/data/glitch-hoodie-variant-matrix.json
 *   worker/src/print/glitch-hoodie-variant-matrix.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");

const PRINTIFY_SHOP_ID = "27530167";
const PRINTIFY_PRODUCT_ID = "6a18a4d17f274f4c3e04f646";

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "3XL"];
const COLOR_ORDER = [
  "Black",
  "Charcoal Heather",
  "Light Steel",
  "Navy",
  "Royal Blue",
  "Stone Grey",
  "White",
];

function loadToken() {
  if (process.env.PRINTIFY_API_TOKEN?.trim()) return process.env.PRINTIFY_API_TOKEN.trim();
  if (!existsSync(devVarsPath)) return null;
  for (const line of readFileSync(devVarsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() !== "PRINTIFY_API_TOKEN") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.trim() || null;
  }
  return null;
}

function slug(color, size) {
  return `${color.toLowerCase().replace(/\s+/g, "-")}-${size.toLowerCase()}`;
}

function buildMatrix(variants) {
  const rows = [];
  for (const v of variants) {
    if (!v.is_enabled) continue;
    const parts = String(v.title ?? "")
      .split("/")
      .map((s) => s.trim());
    const color = parts[0] ?? "";
    const size = parts[1] ?? "";
    rows.push({
      print_variant_id: slug(color, size),
      label: v.title,
      color,
      size,
      printify_variant_id: v.id,
    });
  }
  rows.sort((a, b) => {
    const ci = COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color);
    if (ci !== 0) return ci;
    return SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
  });
  return rows;
}

function writeTs(rows) {
  const tsPath = path.join(repoRoot, "worker/src/print/glitch-hoodie-variant-matrix.ts");
  const body = rows
    .map(
      (r) =>
        `  { print_variant_id: ${JSON.stringify(r.print_variant_id)}, label: ${JSON.stringify(r.label)}, color: ${JSON.stringify(r.color)}, size: ${JSON.stringify(r.size)}, printify_variant_id: ${r.printify_variant_id} },`
    )
    .join("\n");
  writeFileSync(
    tsPath,
    `/** Printify Champion S700 matrix — product ${PRINTIFY_PRODUCT_ID}. Generated; re-run generate-glitch-hoodie-variant-matrix.mjs to refresh. */

export interface GlitchHoodieVariantEntry {
  print_variant_id: string;
  label: string;
  color: string;
  size: string;
  printify_variant_id: number;
}

export const GLITCH_HOODIE_PRINTIFY_PRODUCT_ID = "${PRINTIFY_PRODUCT_ID}";

export const GLITCH_HOODIE_VARIANT_MATRIX: GlitchHoodieVariantEntry[] = [
${body}
];

const BY_KEY = new Map(
  GLITCH_HOODIE_VARIANT_MATRIX.map((entry) => [entry.print_variant_id, entry])
);

export function resolveGlitchHoodiePrintifyVariantId(
  printVariantId: string | null | undefined
): number | null {
  const key = printVariantId?.trim() ?? "";
  if (!key) return null;
  return BY_KEY.get(key)?.printify_variant_id ?? null;
}

export function glitchHoodieVariantColors(): string[] {
  return [...new Set(GLITCH_HOODIE_VARIANT_MATRIX.map((e) => e.color))];
}

export function glitchHoodieSizesForColor(color: string): string[] {
  return GLITCH_HOODIE_VARIANT_MATRIX.filter((e) => e.color === color).map((e) => e.size);
}
`
  );
  console.log(`✓ ${tsPath} (${rows.length} variants)`);
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error("Missing PRINTIFY_API_TOKEN");
    process.exit(1);
  }
  const res = await fetch(
    `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products/${PRINTIFY_PRODUCT_ID}.json`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );
  const text = await res.text();
  if (!res.ok) {
    console.error(text.slice(0, 300));
    process.exit(1);
  }
  const product = JSON.parse(text);
  const rows = buildMatrix(product.variants ?? []);
  const jsonPath = path.join(repoRoot, "site/data/glitch-hoodie-variant-matrix.json");
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        product_id: "glitch_hoodie_v1",
        printify_product_id: PRINTIFY_PRODUCT_ID,
        blueprint_id: product.blueprint_id,
        print_provider_id: product.print_provider_id,
        variants: rows,
      },
      null,
      2
    )}\n`
  );
  console.log(`✓ ${jsonPath} (${rows.length} variants)`);
  writeTs(rows);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

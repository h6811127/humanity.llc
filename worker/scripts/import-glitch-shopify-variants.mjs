/**
 * Map Shopify product export → glitch_hoodie_v1.variants[] in shop-config.json.
 *
 * Shopify product CSV does not include variant IDs — pass Admin API token to resolve them:
 *
 *   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_… \
 *   SHOPIFY_SHOP_DOMAIN=humanity-llc.myshopify.com \
 *   node worker/scripts/import-glitch-shopify-variants.mjs \
 *     --csv /path/to/products_export.csv \
 *     --write
 *
 * Dry run (mapping report only):
 *   node worker/scripts/import-glitch-shopify-variants.mjs --csv /path/to/products_export.csv
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");
const shopConfigPath = path.join(repoRoot, "site/data/shop-config.json");
const matrixPath = path.join(repoRoot, "site/data/glitch-hoodie-variant-matrix.json");

const DEFAULT_HANDLE = "heavyweight-hoodie-p2016";
const DEFAULT_SHOP = "humanity-llc.myshopify.com";
const PRINTIFY_SIZES = new Set(["S", "M", "L", "XL", "2XL", "3XL"]);

/** Shopify Option1 → Printify matrix color (Champion S700). */
export const SHOPIFY_COLOR_TO_PRINTIFY = {
  BLACK: "Black",
  CHARCOAL: "Charcoal Heather",
  NAVY: "Navy",
  White: "White",
  "GUNMETAL HEATHER": "Stone Grey",
  "ATHLETIC HEATHER": "Light Steel",
};

function loadDevVar(name) {
  if (process.env[name]?.trim()) return process.env[name].trim();
  if (!existsSync(devVarsPath)) return null;
  for (const line of readFileSync(devVarsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() !== name) continue;
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

function parseArgs(argv) {
  const args = { csv: "", write: false, handle: DEFAULT_HANDLE, shop: DEFAULT_SHOP };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") args.write = true;
    else if (a === "--csv") args.csv = argv[++i] ?? "";
    else if (a === "--handle") args.handle = argv[++i] ?? DEFAULT_HANDLE;
    else if (a === "--shop") args.shop = argv[++i] ?? DEFAULT_SHOP;
  }
  return args;
}

/** Minimal CSV row parser (handles quoted multiline fields). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = cells[idx] ?? "";
    });
    return obj;
  });
}

export function parseShopifyExportCsv(text) {
  const records = parseCsv(text);
  const out = [];
  for (const r of records) {
    const sku = String(r["Variant SKU"] ?? "").trim();
    if (!sku) continue;
    const shopifyColor = String(r["Option1 Value"] ?? "").trim();
    const size = String(r["Option2 Value"] ?? "").trim();
    const title = String(r.Title ?? "").trim();
    out.push({ sku, shopifyColor, size, title });
  }
  return out;
}

export function mapShopifyRowToPrintVariant(shopifyColor, size) {
  if (!PRINTIFY_SIZES.has(size)) return null;
  const printifyColor = SHOPIFY_COLOR_TO_PRINTIFY[shopifyColor];
  if (!printifyColor) return null;
  return {
    print_variant_id: slug(printifyColor, size),
    color: printifyColor,
    size,
    shopifyColor,
  };
}

export function buildVariantOverrides(csvRows, shopifyVariantsByKey, shopDomain) {
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  const matrixIds = new Set(matrix.variants.map((v) => v.print_variant_id));
  const overridesById = new Map();
  const report = {
    mapped: [],
    skippedSize: [],
    skippedColor: [],
    duplicateKey: [],
    missingShopifyId: [],
    shopifyUnmapped: [],
  };

  for (const row of csvRows) {
    const mapped = mapShopifyRowToPrintVariant(row.shopifyColor, row.size);
    if (!mapped) {
      if (!PRINTIFY_SIZES.has(row.size)) report.skippedSize.push(row);
      else report.skippedColor.push(row);
      continue;
    }
    if (!matrixIds.has(mapped.print_variant_id)) {
      report.skippedColor.push(row);
      continue;
    }
    const key = `${mapped.shopifyColor}::${mapped.size}`;
    const shopifyVariant = shopifyVariantsByKey.get(key);
    const shopifyVariantId = shopifyVariant ? String(shopifyVariant.id) : "";
    if (!shopifyVariantId) report.missingShopifyId.push({ ...row, ...mapped });

    if (overridesById.has(mapped.print_variant_id)) {
      report.duplicateKey.push(mapped.print_variant_id);
      continue;
    }

    overridesById.set(mapped.print_variant_id, {
      print_variant_id: mapped.print_variant_id,
      shopify_variant_id: shopifyVariantId,
      checkout_url: shopifyVariantId
        ? `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/cart/${shopifyVariantId}:1`
        : "",
      _sku: row.sku,
    });
    report.mapped.push({ ...mapped, sku: row.sku, shopify_variant_id: shopifyVariantId });
  }

  for (const v of matrix.variants) {
    if (!overridesById.has(v.print_variant_id)) {
      report.shopifyUnmapped.push(v);
    }
  }

  const overrides = matrix.variants.map((v) => {
    const row = overridesById.get(v.print_variant_id);
    return row
      ? {
          print_variant_id: row.print_variant_id,
          shopify_variant_id: row.shopify_variant_id,
          checkout_url: row.checkout_url,
        }
      : {
          print_variant_id: v.print_variant_id,
          shopify_variant_id: "",
          checkout_url: "",
        };
  });

  return { overrides, report };
}

function normalizeShopifyColor(value) {
  return String(value ?? "").trim();
}

function variantKey(color, size) {
  return `${normalizeShopifyColor(color)}::${String(size ?? "").trim()}`;
}

export async function fetchShopifyVariants(shopDomain, accessToken, handle) {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${shop}/admin/api/2024-10/products.json?handle=${encodeURIComponent(handle)}&fields=id,handle,title,variants`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Shopify Admin API ${res.status}: ${text.slice(0, 240)}`);
  }
  const json = JSON.parse(text);
  const product = json.products?.[0];
  if (!product) throw new Error(`No Shopify product for handle ${handle}`);
  const byKey = new Map();
  for (const v of product.variants ?? []) {
    byKey.set(variantKey(v.option1, v.option2), v);
  }
  return { product, byKey };
}

function printReport(report) {
  console.log(`Mapped ${report.mapped.length} Shopify rows → print_variant_id`);
  if (report.skippedSize.length) {
    console.log(`Skipped ${report.skippedSize.length} rows (size not in Printify matrix, e.g. XS)`);
  }
  if (report.skippedColor.length) {
    console.log(`Skipped ${report.skippedColor.length} rows (color not mapped)`);
  }
  if (report.missingShopifyId.length) {
    console.log(`Missing Shopify variant ID for ${report.missingShopifyId.length} mapped rows`);
  }
  if (report.shopifyUnmapped.length) {
    console.log(
      `Printify matrix variants with no Shopify counterpart: ${report.shopifyUnmapped.length}`
    );
    for (const v of report.shopifyUnmapped) {
      console.log(`  - ${v.print_variant_id} (${v.label})`);
    }
  }
  const wired = report.mapped.filter((r) => r.shopify_variant_id).length;
  console.log(`Checkout-ready overrides: ${wired} / ${report.mapped.length} mapped`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.csv) {
    console.error("Usage: node worker/scripts/import-glitch-shopify-variants.mjs --csv path [--write]");
    process.exit(1);
  }
  const csvText = readFileSync(args.csv, "utf8");
  const csvRows = parseShopifyExportCsv(csvText);
  const token = loadDevVar("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const shop = loadDevVar("SHOPIFY_SHOP_DOMAIN") ?? args.shop;

  let byKey = new Map();
  if (token) {
    const fetched = await fetchShopifyVariants(shop, token, args.handle);
    console.log(`Shopify product: ${fetched.product.title} (${fetched.product.id})`);
    byKey = fetched.byKey;
  } else {
    console.warn(
      "No SHOPIFY_ADMIN_ACCESS_TOKEN in worker/.dev.vars — add it and re-run."
    );
  }

  const { overrides, report } = buildVariantOverrides(csvRows, byKey, shop);
  printReport(report);

  if (!args.write) {
    console.log("\nDry run — pass --write to update site/data/shop-config.json");
    return;
  }

  const wiredForWrite = overrides.filter((v) => v.shopify_variant_id && v.checkout_url);
  if (!token || wiredForWrite.length === 0) {
    console.error(
      "\nRefusing to write shop-config.json: no checkout-ready variants. Add SHOPIFY_ADMIN_ACCESS_TOKEN to worker/.dev.vars and re-run with --write."
    );
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(shopConfigPath, "utf8"));
  const products = config.personalize?.products ?? [];
  const idx = products.findIndex((p) => p.product_id === "glitch_hoodie_v1");
  if (idx < 0) throw new Error("glitch_hoodie_v1 not found in shop-config.json");

  const wired = overrides.filter((v) => v.shopify_variant_id && v.checkout_url);
  const defaultVariant = overrides.find((v) => v.print_variant_id === "black-m") ?? wired[0];

  products[idx] = {
    ...products[idx],
    variants: overrides,
    shopify_variant_id: defaultVariant?.shopify_variant_id ?? "",
    checkout_url: defaultVariant?.checkout_url ?? "",
  };
  config.personalize = {
    ...config.personalize,
    checkout_open: wired.length > 0,
    products,
  };

  writeFileSync(shopConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Updated ${shopConfigPath} (${wired.length} variants with checkout URLs)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

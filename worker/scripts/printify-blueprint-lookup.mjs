/**
 * Resolve Printify catalog IDs for Worker env wiring.
 *
 * Usage:
 *   PRINTIFY_API_TOKEN=… npm run printify:lookup-blueprint -- 528
 *   PRINTIFY_API_TOKEN=… npm run printify:lookup-blueprint -- 528 --color "Solid Black" --size M
 *   PRINTIFY_API_TOKEN=… npm run printify:lookup-blueprint -- 528 --provider 39
 *
 * Token: env PRINTIFY_API_TOKEN or worker/.dev.vars (gitignored).
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Tier 1 hoodie (Champion S700)
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

/** Approved Tier 1 hoodie blank — Champion S700 (Printify catalog). */
export const HOODIE_BLUEPRINT_ID = 528;
export const HOODIE_CATALOG_URL =
  "https://printify.com/app/products/528/champion/champion-hoodie";

function loadToken() {
  if (process.env.PRINTIFY_API_TOKEN?.trim()) {
    return process.env.PRINTIFY_API_TOKEN.trim();
  }
  if (!existsSync(devVarsPath)) return null;
  const text = readFileSync(devVarsPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "PRINTIFY_API_TOKEN") continue;
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

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1]?.trim() || null;
}

function positionalBlueprintId() {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("-")) continue;
    const n = Number.parseInt(arg, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return HOODIE_BLUEPRINT_ID;
}

async function printifyGet(token, urlPath) {
  const res = await fetch(`${PRINTIFY_API_BASE}${urlPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${urlPath} → ${res.status}: ${text.slice(0, 240)}`);
  }
  return JSON.parse(text);
}

function normalizeProviders(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray(body.data)) return body.data;
  return [];
}

function normalizeVariants(body) {
  if (Array.isArray(body?.variants)) return body.variants;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray(body.data)) return body.data;
  return [];
}

function variantMatches(variant, colorFilter, sizeFilter) {
  const options = variant?.options ?? {};
  const color = String(options.color ?? variant?.title ?? "").toLowerCase();
  const size = String(options.size ?? "").toLowerCase();
  if (colorFilter && !color.includes(colorFilter.toLowerCase())) return false;
  if (sizeFilter && size !== sizeFilter.toLowerCase()) return false;
  return true;
}

function frontPlaceholderSummary(variant) {
  const placeholders = Array.isArray(variant?.placeholders) ? variant.placeholders : [];
  const front = placeholders.filter((p) => p?.position === "front");
  if (front.length === 0) return "no front placeholder";
  return front
    .map((p) => `${p.position}${p.decoration_method ? ` (${p.decoration_method})` : ""}`)
    .join(", ");
}

function prefersQrPrintMethod(variant) {
  const placeholders = Array.isArray(variant?.placeholders) ? variant.placeholders : [];
  return placeholders.some(
    (p) =>
      p?.position === "front" &&
      typeof p.decoration_method === "string" &&
      /dtf|dtg|digital/i.test(p.decoration_method)
  );
}

function printWranglerSnippet({ blueprintId, providerId, variantId }) {
  console.log("\nSuggested worker/wrangler.toml [vars] (hoodie):");
  console.log(`# Champion S700 — ${HOODIE_CATALOG_URL}`);
  console.log(`PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID = "${blueprintId}"`);
  console.log(`PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID = "${providerId}"`);
  console.log(`PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID = "${variantId}"`);
  console.log(`PERSONALIZE_HOODIE_PRINTIFY_PLACEHOLDER = "front"`);
  console.log(
    "# PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID = \"<shop product id after you save a template in Printify>\""
  );
  console.log("# Secrets: wrangler secret put PRINTIFY_API_TOKEN");
  console.log("#          wrangler secret put PRINTIFY_SHOP_ID");
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error(
      "Missing PRINTIFY_API_TOKEN. Set env or add to worker/.dev.vars (see worker/.dev.vars.example)."
    );
    process.exit(1);
  }

  const blueprintId = positionalBlueprintId();
  const providerFilter = readArg("--provider");
  const colorFilter = readArg("--color") ?? "Black";
  const sizeFilter = readArg("--size") ?? "M";

  console.log(`Printify blueprint lookup — id ${blueprintId}`);
  if (blueprintId === HOODIE_BLUEPRINT_ID) {
    console.log(`Catalog: ${HOODIE_CATALOG_URL}`);
  }
  console.log(`Filter: color ~ "${colorFilter}", size = "${sizeFilter}"\n`);

  const blueprint = await printifyGet(token, `/catalog/blueprints/${blueprintId}.json`);
  console.log(`Blueprint: ${blueprint?.title ?? blueprint?.brand ?? "(unknown)"}\n`);

  const providers = normalizeProviders(
    await printifyGet(token, `/catalog/blueprints/${blueprintId}/print_providers.json`)
  );
  if (providers.length === 0) {
    console.error("No print providers returned for this blueprint.");
    process.exit(1);
  }

  console.log("Print providers:");
  for (const provider of providers) {
    const id = provider?.id ?? provider?.print_provider_id;
    const title = provider?.title ?? provider?.name ?? "";
    console.log(`  • ${id} — ${title}`);
  }

  const providerIds = providerFilter
    ? [Number.parseInt(providerFilter, 10)]
    : providers.map((p) => p?.id ?? p?.print_provider_id).filter(Boolean);

  /** @type {{ providerId: number, providerTitle: string, variant: Record<string, unknown> }[]} */
  const matches = [];

  for (const providerId of providerIds) {
    const provider = providers.find((p) => (p?.id ?? p?.print_provider_id) === providerId);
    const providerTitle = provider?.title ?? provider?.name ?? `provider ${providerId}`;
    const body = await printifyGet(
      token,
      `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`
    );
    const variants = normalizeVariants(body);
    for (const variant of variants) {
      if (!variantMatches(variant, colorFilter, sizeFilter)) continue;
      matches.push({ providerId, providerTitle, variant });
    }
  }

  if (matches.length === 0) {
    console.error(
      `\nNo variants matched color "${colorFilter}" / size "${sizeFilter}".` +
        " Try --color or --size, or omit filters to inspect all providers."
    );
    process.exit(1);
  }

  console.log(`\nMatching variants (${colorFilter} / ${sizeFilter}):`);
  for (const { providerId, providerTitle, variant } of matches) {
    const id = variant.id;
    const title = variant.title ?? JSON.stringify(variant.options ?? {});
    const qrOk = prefersQrPrintMethod(variant);
    console.log(
      `  • variant ${id} — ${title}\n` +
        `    provider ${providerId} (${providerTitle})\n` +
        `    front: ${frontPlaceholderSummary(variant)}` +
        (qrOk ? " ✓ QR-friendly (DTF/DTG on front)" : " ⚠ front may be embroidery-only — pick another provider")
    );
  }

  const preferred =
    matches.find(({ variant }) => prefersQrPrintMethod(variant)) ?? matches[0];

  printWranglerSnippet({
    blueprintId,
    providerId: preferred.providerId,
    variantId: preferred.variant.id,
  });

  console.log(
    "\nNext: create/save a reference product in your Printify shop (same blueprint/provider/variant)" +
      " for shipping quotes → copy its product id into PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID."
  );
  console.log("Then: npm run worker:deploy && npm run merch-funnel:rollout:step4 -- --strict");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

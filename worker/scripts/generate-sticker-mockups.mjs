/**
 * Export Printify mock-up images for sticker_personalized_v1 (read-only product.images[]).
 *
 *   npm run printify:export-sticker-mockups
 *
 * Writes site/data/sticker-mockups.json — kiss-cut flat + context angles.
 *
 * Prerequisite: upload npm run print:sticker-printify-pngs art to Printify, regenerate mockups.
 *
 * Env:
 *   PRINTIFY_API_TOKEN — or worker/.dev.vars
 *   PRINTIFY_STICKER_PRODUCT_ID — Printify product id (defaults PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID)
 *   PRINTIFY_STICKER_VARIANT_ID — optional filter (defaults PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");
const outPath = path.join(repoRoot, "site/data/sticker-mockups.json");

const PRINTIFY_SHOP_ID = "27530167";
const DEFAULT_VIEW = "flat";

const VIEW_ORDER = ["flat", "on-laptop", "on-gift", "front", "context"];

const VIEW_LABELS = {
  flat: "Kiss cut",
  front: "Kiss cut",
  "on-laptop": "On laptop",
  "person-1-lifestyle": "On laptop",
  "on-gift": "On gift",
  "person-2-lifestyle": "On gift",
  context: "Flat lay",
};

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

function readEnv(key) {
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  if (!existsSync(devVarsPath)) return "";
  for (const line of readFileSync(devVarsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.trim();
  }
  return "";
}

function cameraLabelFromSrc(src) {
  try {
    return new URL(src).searchParams.get("camera_label")?.trim() ?? "";
  } catch {
    const match = String(src).match(/camera_label=([^&]+)/);
    return match?.[1]?.trim() ?? "";
  }
}

function normalizeViewId(cameraLabel, position) {
  const label = cameraLabel?.trim() || position?.trim() || "flat";
  if (label === "front") return "flat";
  if (label === "person-1-lifestyle") return "on-laptop";
  if (label === "person-2-lifestyle") return "on-gift";
  if (label === "context") return "on-gift";
  return label;
}

function compareViewOrder(a, b) {
  const ai = VIEW_ORDER.indexOf(a);
  const bi = VIEW_ORDER.indexOf(b);
  return (ai === -1 ? VIEW_ORDER.length : ai) - (bi === -1 ? VIEW_ORDER.length : bi);
}

/** @returns {Record<string, string>} */
function loadExistingLocalSrc() {
  /** @type {Record<string, string>} */
  const localSrc = {};
  if (!existsSync(outPath)) return localSrc;
  try {
    const parsed = JSON.parse(readFileSync(outPath, "utf8"));
    const mockups = parsed?.mockups;
    if (!Array.isArray(mockups)) return localSrc;
    for (const entry of mockups) {
      if (!entry || typeof entry !== "object") continue;
      const viewId =
        (typeof entry.view_id === "string" ? entry.view_id.trim() : "") ||
        normalizeViewId("", entry.position ?? "");
      const local = typeof entry.local_src === "string" ? entry.local_src.trim() : "";
      if (viewId && local) localSrc[viewId] = local;
    }
  } catch {
    /* ignore */
  }
  return localSrc;
}

/**
 * @param {Array<Record<string, unknown>>} images
 * @param {number | null} variantId
 */
function filterImages(images, variantId) {
  if (!variantId) return images;
  return images.filter(
    (img) =>
      Array.isArray(img.variant_ids) &&
      img.variant_ids.some((id) => Number(id) === variantId)
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, string>} localSrc
 */
function buildMockupList(rows, localSrc) {
  /** @type {Map<string, { view_id: string, label: string, src: string, local_src?: string, is_default: boolean }>} */
  const byView = new Map();
  for (const row of rows) {
    const src = typeof row.src === "string" ? row.src.trim() : "";
    if (!src) continue;
    const cameraLabel = cameraLabelFromSrc(src) || String(row.position ?? "").trim();
    const viewId = normalizeViewId(cameraLabel, row.position);
    if (byView.has(viewId)) continue;
    const entry = {
      view_id: viewId,
      label: VIEW_LABELS[viewId] ?? VIEW_LABELS[cameraLabel] ?? viewId.replace(/-/g, " "),
      src,
      is_default: viewId === DEFAULT_VIEW || row.is_default === true,
    };
    const local = localSrc[viewId]?.trim();
    if (local) entry.local_src = local;
    byView.set(viewId, entry);
  }
  const out = [...byView.values()].sort((a, b) => compareViewOrder(a.view_id, b.view_id));
  if (out.length && !out.some((entry) => entry.is_default)) {
    out[0].is_default = true;
  }
  return out;
}

/**
 * @param {string} token
 * @param {string} productId
 */
async function fetchPrintifyProductImages(token, productId) {
  const res = await fetch(
    `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Printify product ${productId}: ${text.slice(0, 200)}`);
  }
  const product = JSON.parse(text);
  return Array.isArray(product.images) ? product.images : [];
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error("Missing PRINTIFY_API_TOKEN (env or worker/.dev.vars)");
    process.exit(1);
  }

  const productId =
    readEnv("PRINTIFY_STICKER_PRODUCT_ID") ||
    readEnv("PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID");
  if (!productId) {
    console.error(
      "Missing PRINTIFY_STICKER_PRODUCT_ID or PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID"
    );
    process.exit(1);
  }

  const variantRaw =
    readEnv("PRINTIFY_STICKER_VARIANT_ID") ||
    readEnv("PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID");
  const variantId = variantRaw ? Number.parseInt(variantRaw, 10) : null;
  const localSrc = loadExistingLocalSrc();

  console.log(`Printify shop ${PRINTIFY_SHOP_ID}`);
  console.log(`Product ${productId}`);
  if (variantId) console.log(`Variant filter ${variantId}`);
  console.log("");

  const images = await fetchPrintifyProductImages(token, productId);
  const filtered = filterImages(images, Number.isFinite(variantId) ? variantId : null);
  const mockups = buildMockupList(filtered.length ? filtered : images, localSrc);

  if (!mockups.length) {
    console.error("No mockup images returned — upload print art and regenerate Printify mockups first.");
    process.exit(1);
  }

  const payload = {
    product_id: "sticker_personalized_v1",
    printify_product_id: productId,
    printify_variant_id: Number.isFinite(variantId) ? variantId : null,
    generated_at: new Date().toISOString(),
    default_view: DEFAULT_VIEW,
    mockups,
  };

  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`✓ ${mockups.length} mockup view(s)`);
  for (const entry of mockups) {
    const srcNote = entry.local_src ? `${entry.local_src} (local)` : entry.src.slice(0, 60);
    console.log(`  ${entry.view_id}: ${entry.label} — ${srcNote}`);
  }
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

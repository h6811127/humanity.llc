/**
 * Export all Printify mock-up images for glitch_hoodie_v1 (read-only product.images[]).
 *
 *   npm run printify:export-glitch-mockups
 *
 * Writes site/data/glitch-hoodie-mockups.json — every camera angle per color (back, front, on-model, …).
 *
 * Optional on mockups[] rows (preserved across re-runs by color + view_id):
 *   local_src        — self-hosted sample mock (replaces src in UI)
 *   src_blank        — Printify URL for blank back (transparent preview)
 *   local_src_blank  — self-hosted blank back (preferred over src_blank)
 *
 * Auto: blank-back files under site/images/merch/glitch-mockups/ or site/images/glitch-mockups/
 *   named {slug}-back-blank.{jpg,png,…} or {slug}-blank-back.{jpg,png,…} → local_src_blank.
 *
 * Optional env PRINTIFY_GLITCH_TRANSPARENT_PRODUCT_ID — Printify product with transparent
 *   print art (red finder); mock URLs merge into src_transparent per view (all angles).
 *
 * Optional env PRINTIFY_GLITCH_BLANK_PRODUCT_ID — blank-back assets (legacy); src_blank on back only.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  glitchHoodieBlankBackLocalCandidates,
} from "../../site/js/shop-glitch-hoodie-mockups-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const devVarsPath = path.join(repoRoot, "worker/.dev.vars");
const matrixPath = path.join(repoRoot, "site/data/glitch-hoodie-variant-matrix.json");
const outPath = path.join(repoRoot, "site/data/glitch-hoodie-mockups.json");

const PRINTIFY_SHOP_ID = "27530167";
const PRINTIFY_PRODUCT_ID = "6a18a4d17f274f4c3e04f646";
const REPRESENTATIVE_SIZE = "M";
const DEFAULT_VIEW = "back";

const VIEW_ORDER = ["back", "front", "person-1-lifestyle", "person-2-lifestyle"];

const VIEW_LABELS = {
  back: "Back",
  front: "Front",
  "person-1-lifestyle": "On model",
  "person-2-lifestyle": "On model 2",
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

function cameraLabelFromSrc(src) {
  try {
    return new URL(src).searchParams.get("camera_label")?.trim() ?? "";
  } catch {
    const match = String(src).match(/camera_label=([^&]+)/);
    return match?.[1]?.trim() ?? "";
  }
}

/**
 * @returns {{
 *   localSrc: Record<string, Record<string, string>>,
 *   localSrcTransparent: Record<string, Record<string, string>>,
 *   localSrcBlank: Record<string, Record<string, string>>,
 *   srcBlank: Record<string, Record<string, string>>,
 *   srcTransparent: Record<string, Record<string, string>>,
 * }}
 */
function loadExistingMockupOverrides() {
  /** @type {Record<string, Record<string, string>>} */
  const localSrc = {};
  /** @type {Record<string, Record<string, string>>} */
  const localSrcTransparent = {};
  /** @type {Record<string, Record<string, string>>} */
  const localSrcBlank = {};
  /** @type {Record<string, Record<string, string>>} */
  const srcBlank = {};
  /** @type {Record<string, Record<string, string>>} */
  const srcTransparent = {};
  if (!existsSync(outPath)) {
    return { localSrc, localSrcTransparent, localSrcBlank, srcBlank, srcTransparent };
  }
  try {
    const parsed = JSON.parse(readFileSync(outPath, "utf8"));
    const byColor = parsed?.by_color;
    if (!byColor || typeof byColor !== "object") {
      return { localSrc, localSrcTransparent, localSrcBlank, srcBlank, srcTransparent };
    }
    for (const [color, row] of Object.entries(byColor)) {
      if (!row || typeof row !== "object" || !Array.isArray(row.mockups)) continue;
      for (const entry of row.mockups) {
        if (!entry || typeof entry !== "object") continue;
        const viewId =
          (typeof entry.view_id === "string" ? entry.view_id.trim() : "") ||
          (typeof entry.camera_label === "string" ? entry.camera_label.trim() : "");
        if (!viewId) continue;
        const local = typeof entry.local_src === "string" ? entry.local_src.trim() : "";
        if (local) {
          if (!localSrc[color]) localSrc[color] = {};
          localSrc[color][viewId] = local;
        }
        const localBlank =
          typeof entry.local_src_blank === "string" ? entry.local_src_blank.trim() : "";
        if (localBlank) {
          if (!localSrcBlank[color]) localSrcBlank[color] = {};
          localSrcBlank[color][viewId] = localBlank;
        }
        const localTransparent =
          typeof entry.local_src_transparent === "string" ? entry.local_src_transparent.trim() : "";
        if (localTransparent) {
          if (!localSrcTransparent[color]) localSrcTransparent[color] = {};
          localSrcTransparent[color][viewId] = localTransparent;
        }
        const transparent =
          typeof entry.src_transparent === "string" ? entry.src_transparent.trim() : "";
        if (transparent) {
          if (!srcTransparent[color]) srcTransparent[color] = {};
          srcTransparent[color][viewId] = transparent;
        }
        const blank =
          typeof entry.src_blank === "string" ? entry.src_blank.trim() : "";
        if (blank) {
          if (!srcBlank[color]) srcBlank[color] = {};
          srcBlank[color][viewId] = blank;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { localSrc, localSrcTransparent, localSrcBlank, srcBlank, srcTransparent };
}

function discoverBlankBackLocalPath(color) {
  const siteDir = path.join(repoRoot, "site");
  for (const rel of glitchHoodieBlankBackLocalCandidates(color)) {
    const abs = path.join(siteDir, rel.replace(/^\//, ""));
    if (existsSync(abs)) return rel;
  }
  return "";
}

/** @param {Array<Record<string, unknown>>} images @param {number} printifyVariantId */
function mockupsForVariant(images, printifyVariantId) {
  return images.filter(
    (img) =>
      Array.isArray(img.variant_ids) &&
      img.variant_ids.some((id) => Number(id) === printifyVariantId)
  );
}

function compareViewOrder(a, b) {
  const ai = VIEW_ORDER.indexOf(a);
  const bi = VIEW_ORDER.indexOf(b);
  return (ai === -1 ? VIEW_ORDER.length : ai) - (bi === -1 ? VIEW_ORDER.length : bi);
}

/** @param {Array<Record<string, unknown>>} rows */
function buildMockupList(rows) {
  /** @type {Array<{ view_id: string, camera_label: string, position: string, label: string, src: string, is_default: boolean }>} */
  const out = [];
  for (const row of rows) {
    const src = typeof row.src === "string" ? row.src.trim() : "";
    if (!src) continue;
    const cameraLabel = cameraLabelFromSrc(src) || String(row.position ?? "").trim() || "view";
    const viewId = cameraLabel;
    out.push({
      view_id: viewId,
      camera_label: cameraLabel,
      position: typeof row.position === "string" ? row.position : "",
      label: VIEW_LABELS[cameraLabel] ?? cameraLabel.replace(/-/g, " "),
      src,
      is_default: row.is_default === true,
    });
  }
  out.sort((a, b) => compareViewOrder(a.camera_label, b.camera_label));
  return out;
}

/**
 * @param {Array<Record<string, unknown>>} matrixVariants
 * @param {Array<Record<string, unknown>>} images
 * @param {ReturnType<typeof loadExistingMockupOverrides>} overrides
 * @param {Record<string, { back: string }>} [blankProductBackByColor]
 * @param {Array<Record<string, unknown>> | null} [transparentImages]
 */
function buildByColor(matrixVariants, images, overrides, blankProductBackByColor = {}, transparentImages = null) {
  /** @type {Map<string, { printify_variant_id: number }>} */
  const byColor = new Map();
  for (const row of matrixVariants) {
    if (!row?.color || row.size !== REPRESENTATIVE_SIZE) continue;
    if (!byColor.has(row.color)) {
      byColor.set(row.color, { printify_variant_id: Number(row.printify_variant_id) });
    }
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [color, meta] of byColor) {
    const rows = mockupsForVariant(images, meta.printify_variant_id);
    const mockups = buildMockupList(rows);
    const colorLocals = overrides.localSrc[color] ?? {};
    const colorLocalsTransparent = overrides.localSrcTransparent[color] ?? {};
    const colorLocalsBlank = overrides.localSrcBlank[color] ?? {};
    const colorSrcBlank = overrides.srcBlank[color] ?? {};
    const colorSrcTransparent = overrides.srcTransparent[color] ?? {};
    const blankFromProduct = blankProductBackByColor[color] ?? {};

    const transparentByView = new Map();
    if (transparentImages) {
      const tRows = mockupsForVariant(transparentImages, meta.printify_variant_id);
      for (const t of buildMockupList(tRows)) {
        transparentByView.set(t.view_id, t.src);
      }
    }

    for (const entry of mockups) {
      const local = colorLocals[entry.view_id];
      if (local) entry.local_src = local;

      const fromTransparentProduct = transparentByView.get(entry.view_id)?.trim() ?? "";
      const preservedTransparent = colorSrcTransparent[entry.view_id]?.trim() ?? "";
      const transparentSrc = fromTransparentProduct || preservedTransparent;
      if (transparentSrc) entry.src_transparent = transparentSrc;

      const localTransparent = colorLocalsTransparent[entry.view_id];
      if (localTransparent) entry.local_src_transparent = localTransparent;

      if (entry.view_id !== "back" && entry.camera_label !== "back") continue;

      const productBlank = blankFromProduct.back?.trim() ?? "";
      const preservedBlank = colorSrcBlank[entry.view_id]?.trim() ?? "";
      const blankSrc = productBlank || preservedBlank;
      if (blankSrc) entry.src_blank = blankSrc;

      const localBlank =
        colorLocalsBlank[entry.view_id] ||
        discoverBlankBackLocalPath(color) ||
        "";
      if (localBlank) entry.local_src_blank = localBlank;
    }

    out[color] = {
      printify_variant_id: meta.printify_variant_id,
      default_view: DEFAULT_VIEW,
      mockups,
    };
  }
  return out;
}

/**
 * @param {string} token
 * @param {string} productId
 * @returns {Promise<Array<Record<string, unknown>>>}
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

/**
 * @param {Array<Record<string, unknown>>} matrixVariants
 * @param {Array<Record<string, unknown>>} blankImages
 * @returns {Record<string, { back: string }>}
 */
function blankBackSrcByColor(matrixVariants, blankImages) {
  /** @type {Map<string, number>} */
  const variantByColor = new Map();
  for (const row of matrixVariants) {
    if (!row?.color || row.size !== REPRESENTATIVE_SIZE) continue;
    if (!variantByColor.has(row.color)) {
      variantByColor.set(row.color, Number(row.printify_variant_id));
    }
  }

  /** @type {Record<string, { back: string }>} */
  const out = {};
  for (const [color, variantId] of variantByColor) {
    const rows = mockupsForVariant(blankImages, variantId);
    const back = rows.find((row) => {
      const src = typeof row.src === "string" ? row.src.trim() : "";
      if (!src) return false;
      const label = cameraLabelFromSrc(src) || String(row.position ?? "").trim();
      return label === "back";
    });
    const src = typeof back?.src === "string" ? back.src.trim() : "";
    if (src) out[color] = { back: src };
  }
  return out;
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error("Missing PRINTIFY_API_TOKEN");
    process.exit(1);
  }
  if (!existsSync(matrixPath)) {
    console.error(`Missing ${matrixPath} — run npm run printify:export-glitch-variants first`);
    process.exit(1);
  }

  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  const matrixVariants = Array.isArray(matrix.variants) ? matrix.variants : [];

  const images = await fetchPrintifyProductImages(token, PRINTIFY_PRODUCT_ID);
  const overrides = loadExistingMockupOverrides();

  const transparentProductId = process.env.PRINTIFY_GLITCH_TRANSPARENT_PRODUCT_ID?.trim() ?? "";
  let transparentImages = null;
  if (transparentProductId) {
    transparentImages = await fetchPrintifyProductImages(token, transparentProductId);
    console.log(`Transparent product ${transparentProductId}: merging src_transparent`);
  }

  const blankProductId = process.env.PRINTIFY_GLITCH_BLANK_PRODUCT_ID?.trim() ?? "";
  /** @type {Record<string, { back: string }>} */
  let blankProductBackByColor = {};
  if (blankProductId) {
    const blankImages = await fetchPrintifyProductImages(token, blankProductId);
    blankProductBackByColor = blankBackSrcByColor(matrixVariants, blankImages);
    console.log(
      `Blank product ${blankProductId}: ${Object.keys(blankProductBackByColor).length} back URLs`
    );
  }

  const byColor = buildByColor(
    matrixVariants,
    images,
    overrides,
    blankProductBackByColor,
    transparentImages
  );

  let totalViews = 0;
  let transparentViewCount = 0;
  let blankBackCount = 0;
  for (const row of Object.values(byColor)) {
    const mockups = Array.isArray(row.mockups) ? row.mockups : [];
    totalViews += mockups.length;
    for (const entry of mockups) {
      if (entry?.src_transparent) transparentViewCount += 1;
      if (entry?.local_src_blank) blankBackCount += 1;
    }
  }

  const payload = {
    product_id: "glitch_hoodie_v1",
    printify_product_id: PRINTIFY_PRODUCT_ID,
    ...(transparentProductId ? { printify_transparent_product_id: transparentProductId } : {}),
    generated_at: new Date().toISOString(),
    representative_size: REPRESENTATIVE_SIZE,
    default_view: DEFAULT_VIEW,
    by_color: byColor,
  };

  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `✓ ${outPath} (${Object.keys(byColor).length} colors, ${totalViews} mockup views, ${transparentViewCount} transparent mock URLs)`
  );
  if (transparentViewCount === 0) {
    console.log(
      `  Tip: set PRINTIFY_GLITCH_TRANSPARENT_PRODUCT_ID to your transparent-art Printify product, then re-run`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

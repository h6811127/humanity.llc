/**
 * Glitch hoodie Printify mock-up gallery for /shop/customize/.
 * Data: site/data/glitch-hoodie-mockups.json (npm run printify:export-glitch-mockups)
 */

export const GLITCH_HOODIE_MOCKUPS_URL = "/data/glitch-hoodie-mockups.json";

/** Default hero view — live object art + QR on back in Printify product. */
export const GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW = "back";

/** Sort order for view picker (back first). */
export const GLITCH_HOODIE_MOCKUP_VIEW_ORDER = [
  "back",
  "front",
  "person-1-lifestyle",
  "person-2-lifestyle",
];

/**
 * @param {string} src
 * @returns {string}
 */
export function cameraLabelFromMockupSrc(src) {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) return "";
  try {
    return new URL(trimmed).searchParams.get("camera_label")?.trim() ?? "";
  } catch {
    const match = trimmed.match(/camera_label=([^&]+)/);
    return match?.[1]?.trim() ?? "";
  }
}

/**
 * @param {string} cameraLabel
 * @returns {string}
 */
export function glitchHoodieMockupViewLabel(cameraLabel) {
  const key = cameraLabel?.trim() ?? "";
  const labels = {
    back: "Back",
    front: "Front",
    "person-1-lifestyle": "On model",
    "person-2-lifestyle": "On model 2",
  };
  return labels[key] ?? key.replace(/-/g, " ");
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareGlitchMockupViewOrder(a, b) {
  const ai = GLITCH_HOODIE_MOCKUP_VIEW_ORDER.indexOf(a);
  const bi = GLITCH_HOODIE_MOCKUP_VIEW_ORDER.indexOf(b);
  const ar = ai === -1 ? GLITCH_HOODIE_MOCKUP_VIEW_ORDER.length : ai;
  const br = bi === -1 ? GLITCH_HOODIE_MOCKUP_VIEW_ORDER.length : bi;
  return ar - br;
}

/**
 * @typedef {{
 *   view_id: string;
 *   camera_label: string;
 *   position: string;
 *   label: string;
 *   src: string;
 *   src_blank?: string;
 *   src_transparent?: string;
 *   is_default?: boolean;
 * }} GlitchHoodieMockupEntry
 */

/** @typedef {"full" | "transparent"} GlitchMockupPhotoFrameBackground */

/**
 * Filesystem slug for self-hosted blank-back JPEGs (see QR_BRANDING.md).
 * @param {string} color
 * @returns {string}
 */
export function glitchHoodieColorMockupSlug(color) {
  return (color?.trim() ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Search dirs under site/ (Pages serves as /images/…). */
export const GLITCH_HOODIE_BLANK_BACK_REL_DIRS = [
  "/images/merch/glitch-mockups",
  "/images/glitch-mockups",
];

const GLITCH_HOODIE_BLANK_BACK_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Relative URL paths to probe for a color’s blank-back asset (first match wins at export).
 * @param {string} color
 * @returns {string[]}
 */
export function glitchHoodieBlankBackLocalCandidates(color) {
  const slug = glitchHoodieColorMockupSlug(color);
  if (!slug) return [];
  const stems = [`${slug}-back-blank`, `${slug}-blank-back`];
  /** @type {string[]} */
  const out = [];
  for (const dir of GLITCH_HOODIE_BLANK_BACK_REL_DIRS) {
    for (const stem of stems) {
      for (const ext of GLITCH_HOODIE_BLANK_BACK_EXTS) {
        out.push(`${dir}/${stem}${ext}`);
      }
    }
  }
  return out;
}

/**
 * Canonical preferred path (first candidate).
 * @param {string} color
 * @returns {string}
 */
export function glitchHoodieDefaultBlankBackLocalPath(color) {
  return glitchHoodieBlankBackLocalCandidates(color)[0] ?? "";
}

/**
 * @param {GlitchHoodieMockupEntry | null | undefined} entry
 * @returns {boolean}
 */
export function glitchHoodieMockupHasBlankBack(entry) {
  return Boolean(entry?.src_blank?.trim());
}

/**
 * @param {GlitchHoodieMockupEntry | null | undefined} entry
 * @param {{ blankBack?: boolean }} [opts]
 * @returns {string}
 */
/**
 * @param {GlitchHoodieMockupEntry | null | undefined} entry
 * @returns {boolean}
 */
export function glitchHoodieMockupHasTransparentPreview(entry) {
  return Boolean(entry?.src_transparent?.trim());
}

/**
 * @param {GlitchHoodieMockupEntry | null | undefined} entry
 * @param {{ frameBackground?: GlitchMockupPhotoFrameBackground, blankBack?: boolean }} [opts]
 * @returns {string}
 */
export function resolveGlitchMockupPhotoSrc(entry, opts = {}) {
  if (!entry) return "";
  const frameBackground = opts.frameBackground === "transparent" ? "transparent" : "full";
  if (frameBackground === "transparent" && entry.src_transparent?.trim()) {
    return entry.src_transparent.trim();
  }
  if (opts.blankBack && entry.src_blank?.trim()) return entry.src_blank.trim();
  return entry.src?.trim() ?? "";
}

/**
 * @param {unknown} row
 * @returns {GlitchHoodieMockupEntry[]}
 */
export function normalizeGlitchMockupEntries(row) {
  if (!row || typeof row !== "object") return [];
  const mockups = /** @type {Record<string, unknown>} */ (row).mockups;
  if (!Array.isArray(mockups)) return [];

  /** @type {GlitchHoodieMockupEntry[]} */
  const out = [];
  for (const entry of mockups) {
    if (!entry || typeof entry !== "object") continue;
    const localSrc =
      typeof entry.local_src === "string" ? entry.local_src.trim() : "";
    const src =
      localSrc ||
      (typeof entry.src === "string" ? entry.src.trim() : "");
    const localBlankSrc =
      typeof entry.local_src_blank === "string" ? entry.local_src_blank.trim() : "";
    const srcBlank =
      localBlankSrc ||
      (typeof entry.src_blank === "string" ? entry.src_blank.trim() : "");
    const localTransparentSrc =
      typeof entry.local_src_transparent === "string" ? entry.local_src_transparent.trim() : "";
    const srcTransparent =
      localTransparentSrc ||
      (typeof entry.src_transparent === "string" ? entry.src_transparent.trim() : "");
    if (!src) continue;
    const cameraLabel =
      (typeof entry.camera_label === "string" ? entry.camera_label.trim() : "") ||
      cameraLabelFromMockupSrc(src) ||
      (typeof entry.position === "string" ? entry.position.trim() : "") ||
      "view";
    const viewId =
      (typeof entry.view_id === "string" ? entry.view_id.trim() : "") || cameraLabel;
    /** @type {GlitchHoodieMockupEntry} */
    const normalized = {
      view_id: viewId,
      camera_label: cameraLabel,
      position: typeof entry.position === "string" ? entry.position : "",
      label:
        typeof entry.label === "string" && entry.label.trim()
          ? entry.label.trim()
          : glitchHoodieMockupViewLabel(cameraLabel),
      src,
      is_default: entry.is_default === true,
    };
    if (srcBlank) normalized.src_blank = srcBlank;
    if (srcTransparent) normalized.src_transparent = srcTransparent;
    out.push(normalized);
  }

  out.sort((a, b) => compareGlitchMockupViewOrder(a.camera_label, b.camera_label));
  return out;
}

/**
 * @param {unknown} payload
 * @param {string} color
 * @returns {GlitchHoodieMockupEntry[]}
 */
export function listGlitchHoodieMockupsForColor(payload, color) {
  const key = color?.trim();
  if (!key || !payload || typeof payload !== "object") return [];
  const byColor = /** @type {Record<string, unknown>} */ (payload).by_color;
  if (!byColor || typeof byColor !== "object") return [];
  return normalizeGlitchMockupEntries(byColor[key]);
}

/**
 * @param {GlitchHoodieMockupEntry[]} mockups
 * @param {string} [preferredView]
 * @returns {GlitchHoodieMockupEntry | null}
 */
export function resolveDefaultGlitchHoodieMockup(mockups, preferredView = GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW) {
  if (!mockups.length) return null;
  const preferred = mockups.find((m) => m.view_id === preferredView || m.camera_label === preferredView);
  if (preferred) return preferred;
  const back = mockups.find((m) => m.camera_label === "back" || m.position === "back");
  if (back) return back;
  return mockups[0] ?? null;
}

/**
 * @param {GlitchHoodieMockupEntry[]} mockups
 * @param {string} viewId
 * @returns {GlitchHoodieMockupEntry | null}
 */
export function findGlitchHoodieMockupByView(mockups, viewId) {
  const key = viewId?.trim();
  if (!key) return null;
  return (
    mockups.find((m) => m.view_id === key || m.camera_label === key) ??
    null
  );
}

/**
 * @param {unknown} payload
 * @param {string} color
 * @returns {boolean}
 */
export function glitchHoodieHasPrintifyMockups(payload, color) {
  return listGlitchHoodieMockupsForColor(payload, color).length > 0;
}

/**
 * @param {string} [url]
 * @returns {Promise<unknown>}
 */
export async function fetchGlitchHoodieMockups(url = GLITCH_HOODIE_MOCKUPS_URL) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Could not load glitch hoodie mockups (${res.status}).`);
  }
  return res.json();
}

/** @type {Map<string, HTMLImageElement>} */
const preloadedMockupImages = new Map();

/**
 * @param {string} src
 * @returns {boolean}
 */
export function glitchHoodieMockupIsCached(src) {
  const key = src?.trim() ?? "";
  if (!key) return false;
  const img = preloadedMockupImages.get(key);
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/**
 * @param {string} src
 * @returns {Promise<void>}
 */
export function prefetchGlitchHoodieMockupSrc(src) {
  const key = src?.trim() ?? "";
  if (!key) return Promise.resolve();
  if (glitchHoodieMockupIsCached(key)) return Promise.resolve();

  const existing = preloadedMockupImages.get(key);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Mockup prefetch failed.")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Mockup prefetch failed."));
    img.src = key;
    preloadedMockupImages.set(key, img);
  });
}

/**
 * @param {unknown} payload
 * @param {string} color
 */
export function prefetchGlitchHoodieColorMockups(payload, color) {
  for (const entry of listGlitchHoodieMockupsForColor(payload, color)) {
    void prefetchGlitchHoodieMockupSrc(entry.src);
    if (entry.src_transparent) void prefetchGlitchHoodieMockupSrc(entry.src_transparent);
    if (entry.src_blank) void prefetchGlitchHoodieMockupSrc(entry.src_blank);
  }
}

/**
 * @param {unknown} payload
 * @param {string} viewId
 */
export function prefetchGlitchHoodieMockupsForView(payload, viewId) {
  const byColor = /** @type {Record<string, unknown>} */ (payload)?.by_color;
  if (!byColor || typeof byColor !== "object") return;
  for (const color of Object.keys(byColor)) {
    const entry = findGlitchHoodieMockupByView(
      listGlitchHoodieMockupsForColor(payload, color),
      viewId
    );
    if (entry?.src) void prefetchGlitchHoodieMockupSrc(entry.src);
    if (entry?.src_transparent) void prefetchGlitchHoodieMockupSrc(entry.src_transparent);
    if (entry?.src_blank) void prefetchGlitchHoodieMockupSrc(entry.src_blank);
  }
}

/** Prefetch default (back) hero for every color — fast color switching. */
export function prefetchGlitchHoodieDefaultViews(payload) {
  const byColor = /** @type {Record<string, unknown>} */ (payload)?.by_color;
  if (!byColor || typeof byColor !== "object") return;
  for (const color of Object.keys(byColor)) {
    const entry = resolveDefaultGlitchHoodieMockup(listGlitchHoodieMockupsForColor(payload, color));
    if (entry?.src) void prefetchGlitchHoodieMockupSrc(entry.src);
    if (entry?.src_transparent) void prefetchGlitchHoodieMockupSrc(entry.src_transparent);
    if (entry?.src_blank) void prefetchGlitchHoodieMockupSrc(entry.src_blank);
  }
}

/**
 * @param {unknown} payload
 * @param {string} color
 * @param {string} viewId
 */
export function warmGlitchHoodieMockupCache(payload, color, viewId) {
  prefetchGlitchHoodieDefaultViews(payload);
  if (color?.trim()) prefetchGlitchHoodieColorMockups(payload, color.trim());
  if (viewId?.trim()) prefetchGlitchHoodieMockupsForView(payload, viewId.trim());
}

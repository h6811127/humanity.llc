/**
 * PWA install metadata contract (pure helpers).
 * @see docs/PWA_INSTALL.md
 */

export const PWA_INSTALL_DOC = "docs/PWA_INSTALL.md";

/** Canonical manifest URL (Pages static root). */
export const PWA_MANIFEST_PATH = "/manifest.webmanifest";

/** Shell pages that ship manifest link tags and may show install UX. */
export const PWA_SHELL_HTML_PATHS = [
  "/index.html",
  "/wallet/index.html",
  "/created/index.html",
];

/** URL path prefixes where install UX and manifest links must not appear. */
export const PWA_EXCLUDED_PATH_PREFIXES = [
  "/c/",
  "/create/",
  "/scan",
  "/e2e-fixtures/",
  "/prototypes/",
];

/** Minimum icon sizes for installability heuristics (Chromium + iOS). */
export const PWA_REQUIRED_ICON_SIZES = [192, 512];

/** Manifest fields required before Phase 1 can ship. */
export const PWA_REQUIRED_MANIFEST_FIELDS = [
  "name",
  "short_name",
  "start_url",
  "display",
  "background_color",
  "theme_color",
  "icons",
];

/**
 * @param {string} pathname e.g. `/wallet/` or `/c/abc`
 */
export function isPwaExcludedPath(pathname) {
  const path = pathname.endsWith("/") && pathname.length > 1 ? pathname : `${pathname}/`;
  return PWA_EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * @param {string} pathname
 */
export function isPwaShellPagePath(pathname) {
  if (isPwaExcludedPath(pathname)) return false;
  if (pathname === "/" || pathname === "/index.html") return true;
  if (pathname === "/wallet" || pathname === "/wallet/" || pathname.startsWith("/wallet/")) {
    return pathname === "/wallet" || pathname === "/wallet/" || pathname === "/wallet/index.html";
  }
  if (pathname === "/created" || pathname === "/created/" || pathname.startsWith("/created/")) {
    return pathname === "/created" || pathname === "/created/" || pathname === "/created/index.html";
  }
  return false;
}

/**
 * @param {unknown} manifest
 * @returns {{ ok: true } | { ok: false; missing: string[] }}
 */
export function validatePwaManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, missing: [...PWA_REQUIRED_MANIFEST_FIELDS] };
  }
  /** @type {Record<string, unknown>} */
  const record = manifest;
  const missing = PWA_REQUIRED_MANIFEST_FIELDS.filter((field) => {
    const value = record[field];
    if (field === "icons") return !Array.isArray(value) || value.length === 0;
    return value == null || value === "";
  });
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}

/**
 * @param {Array<{ sizes?: string }>} icons
 */
export function manifestIconSizes(icons) {
  const sizes = new Set();
  for (const icon of icons) {
    const raw = String(icon?.sizes ?? "");
    for (const part of raw.split(/\s+/)) {
      const match = /^(\d+)x\d+$/.exec(part.trim());
      if (match) sizes.add(Number(match[1]));
    }
  }
  return sizes;
}

/**
 * @param {Array<{ sizes?: string }>} icons
 */
export function manifestHasRequiredIconSizes(icons) {
  const sizes = manifestIconSizes(icons);
  return PWA_REQUIRED_ICON_SIZES.every((required) => sizes.has(required));
}

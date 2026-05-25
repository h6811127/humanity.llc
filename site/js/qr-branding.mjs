/**
 * Shared QR branding: red modules, center logo overlay, correction Q.
 * Used by site/js/qr-render.mjs and worker/src/resolver/scan-qr.ts.
 */

export const QR_BRAND_RED = "#db1b43";
export const QR_BRAND_LIGHT = "#ffffff";

/** Public path (Pages static asset). */
export const QR_CENTER_LOGO_PATH = "/assets/qr-center-logo.png";

/** Mostly transparent center mark (see docs/QR_BRANDING.md). */
export const QR_CENTER_LOGO_OPACITY = 0.32;

/** Logo width as fraction of QR width — keep small (~5 modules on typical versions). */
export const QR_CENTER_LOGO_SIZE_RATIO = 0.22;

/** Required when center logo is enabled (Technical Standards §8.5). */
export const QR_BRANDED_ERROR_CORRECTION = "Q";

export const QR_BRANDED_RENDER_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: QR_BRANDED_ERROR_CORRECTION,
  color: { dark: QR_BRAND_RED, light: QR_BRAND_LIGHT },
};

/**
 * @param {string} [origin] e.g. https://humanity.llc
 */
export function qrCenterLogoHref(origin = "") {
  const base = String(origin || "").replace(/\/$/, "");
  return base ? `${base}${QR_CENTER_LOGO_PATH}` : QR_CENTER_LOGO_PATH;
}

/**
 * Insert a centered semi-transparent logo into a QR SVG string.
 * @param {string} svg
 * @param {{
 *   logoHref: string,
 *   opacity?: number,
 *   sizeRatio?: number,
 * }} opts
 */
export function overlayCenterLogoOnSvg(
  svg,
  { logoHref, opacity = QR_CENTER_LOGO_OPACITY, sizeRatio = QR_CENTER_LOGO_SIZE_RATIO }
) {
  if (!svg?.includes("</svg>") || !logoHref) return svg;
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch
    ? Number(viewBoxMatch[1])
    : widthMatch
      ? Number(widthMatch[1])
      : 0;
  if (!size) return svg;
  const logoSize = size * sizeRatio;
  const offset = (size - logoSize) / 2;
  const safeHref = String(logoHref)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  const image = `<image href="${safeHref}" x="${offset}" y="${offset}" width="${logoSize}" height="${logoSize}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace("</svg>", `${image}</svg>`);
}

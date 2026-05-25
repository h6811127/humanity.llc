/**
 * Shared QR branding: red modules, vector center logo, correction Q.
 * Used by site/js/qr-render.mjs and worker/src/resolver/scan-qr.ts.
 *
 * The center mark is drawn as SVG/canvas circles (no raster plate) so a white
 * JPEG/PNG backdrop is never composited onto the code.
 */

export const QR_BRAND_RED = "#db1b43";
export const QR_BRAND_LIGHT = "#ffffff";

/** Dusty rose outer ring (matches brand lockup). */
export const QR_CENTER_LOGO_OUTER_FILL = "#c9979f";

/** Inner disc uses brand red. */
export const QR_CENTER_LOGO_INNER_FILL = QR_BRAND_RED;

/** Inner radius as fraction of outer radius. */
export const QR_CENTER_LOGO_INNER_RADIUS_RATIO = 0.52;

/** Mostly transparent center mark — modules show through (docs/QR_BRANDING.md). */
export const QR_CENTER_LOGO_OPACITY = 0.48;

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
 * @param {number} qrSize SVG viewBox edge or canvas width in px
 * @param {number} [sizeRatio]
 */
export function centerLogoMetrics(qrSize, sizeRatio = QR_CENTER_LOGO_SIZE_RATIO) {
  const logoSize = qrSize * sizeRatio;
  const offset = (qrSize - logoSize) / 2;
  const cx = offset + logoSize / 2;
  const cy = offset + logoSize / 2;
  const outerR = logoSize / 2;
  const innerR = outerR * QR_CENTER_LOGO_INNER_RADIUS_RATIO;
  return { logoSize, offset, cx, cy, outerR, innerR };
}

/**
 * Inline SVG fragment: two concentric circles, transparent outside the rings.
 * @param {number} qrSize
 * @param {number} [opacity]
 * @param {number} [sizeRatio]
 */
export function centerLogoSvgFragment(
  qrSize,
  opacity = QR_CENTER_LOGO_OPACITY,
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrSize, sizeRatio);
  return `<g class="hc-qr-center-logo" opacity="${opacity}" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}"/></g>`;
}

/**
 * Insert centered vector logo into a QR SVG string.
 * @param {string} svg
 * @param {{ opacity?: number, sizeRatio?: number }} [opts]
 */
export function overlayCenterLogoOnSvg(svg, opts = {}) {
  if (!svg?.includes("</svg>")) return svg;
  const opacity = opts.opacity ?? QR_CENTER_LOGO_OPACITY;
  const sizeRatio = opts.sizeRatio ?? QR_CENTER_LOGO_SIZE_RATIO;
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch
    ? Number(viewBoxMatch[1])
    : widthMatch
      ? Number(widthMatch[1])
      : 0;
  if (!size) return svg;
  const fragment = centerLogoSvgFragment(size, opacity, sizeRatio);
  return svg.replace("</svg>", `${fragment}</svg>`);
}

/**
 * Draw vector center logo on a 2D canvas (browser).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} qrWidth
 * @param {number} [opacity]
 * @param {number} [sizeRatio]
 */
export function drawCenterLogoOnCanvas(
  ctx,
  qrWidth,
  opacity = QR_CENTER_LOGO_OPACITY,
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrWidth, sizeRatio);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_OUTER_FILL;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_INNER_FILL;
  ctx.fill();
  ctx.restore();
}

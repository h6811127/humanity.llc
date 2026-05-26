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

/** Footer host mark (docs/SCANNER_EXPERIENCE.md § Optical layer). */
export const QR_FRAME_FOOTER_TEXT = "humanity.llc";

/** Live-object band copy on official generators. */
export const QR_FRAME_LIVE_OBJECT_TEXT = "LIVE OBJECT";

/** Grey for footer microtype on frame. */
export const QR_FRAME_FOOTER_FILL = "#8a8a8a";

/**
 * Layout around the QR modules (not including outer canvas margin).
 * @param {number} qrSize
 */
export function qrFrameMetrics(qrSize) {
  const pad = Math.max(4, Math.round(qrSize * 0.045));
  const border = Math.max(1.5, qrSize * 0.011);
  const gap = Math.max(2, Math.round(qrSize * 0.022));
  const pillH = Math.max(9, Math.round(qrSize * 0.068));
  const footerH = Math.max(10, Math.round(qrSize * 0.072));
  const glyphSize = Math.max(5, Math.round(qrSize * 0.085));
  const qrX = pad + border;
  const qrY = pad + border;
  const innerW = qrSize + 2 * (pad + border);
  const pillY = qrY + qrSize + gap;
  const footerY = pillY + pillH + gap;
  const totalHeight = footerY + footerH + pad;
  const glyphCx = pad + glyphSize / 2 + 1;
  const glyphCy = pad + glyphSize / 2 + 1;
  const pillFont = Math.max(5.5, qrSize * 0.062);
  const footerFont = Math.max(5, qrSize * 0.058);
  const cornerR = Math.max(3, qrSize * 0.04);
  return {
    qrSize,
    pad,
    border,
    gap,
    pillH,
    footerH,
    glyphSize,
    qrX,
    qrY,
    innerW,
    totalWidth: innerW,
    totalHeight,
    pillY,
    footerY,
    glyphCx,
    glyphCy,
    pillFont,
    footerFont,
    cornerR,
  };
}

/**
 * @param {string} svg
 */
export function extractQrSvgViewBoxSize(svg) {
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (viewBoxMatch) return Number(viewBoxMatch[1]);
  const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  return widthMatch ? Number(widthMatch[1]) : 0;
}

/**
 * @param {string} svg
 */
export function extractSvgInner(svg) {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return match ? match[1] : svg;
}

/**
 * Network glyph — concentric circles in a fixed frame corner (not in data modules).
 * @param {number} size
 * @param {number} cx
 * @param {number} cy
 * @param {number} [opacity]
 */
export function networkGlyphSvgFragment(size, cx, cy, opacity = 0.88) {
  const outerR = size / 2;
  const innerR = outerR * QR_CENTER_LOGO_INNER_RADIUS_RATIO;
  return `<g class="hc-qr-network-glyph" opacity="${opacity}" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}"/><circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}"/></g>`;
}

/**
 * Wrap branded QR SVG in the signed visual frame (border, glyph, LIVE OBJECT, footer).
 * @param {string} brandedQrSvg QR SVG with center logo already applied
 * @param {{ showLiveObject?: boolean }} [opts]
 */
export function renderHumanityQrFrameSvg(brandedQrSvg, opts = {}) {
  const qrSize = extractQrSvgViewBoxSize(brandedQrSvg);
  if (!qrSize || !brandedQrSvg?.includes("</svg>")) return brandedQrSvg;
  const m = qrFrameMetrics(qrSize);
  const inner = extractSvgInner(brandedQrSvg);
  const showLiveObject = opts.showLiveObject !== false;
  const glyph = networkGlyphSvgFragment(m.glyphSize, m.glyphCx, m.glyphCy);
  const pillText = showLiveObject
    ? `<text class="hc-qr-frame-pill-text" x="${m.innerW / 2}" y="${m.pillY + m.pillH * 0.72}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${m.pillFont}" font-weight="600" letter-spacing="0.14em" fill="${QR_BRAND_RED}">${QR_FRAME_LIVE_OBJECT_TEXT}</text>`
    : "";
  const footerText = `<text class="hc-qr-frame-footer-text" x="${m.innerW / 2}" y="${m.footerY + m.footerH * 0.75}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${m.footerFont}" font-weight="500" fill="${QR_FRAME_FOOTER_FILL}">${QR_FRAME_FOOTER_TEXT}</text>`;
  return `<svg class="hc-qr-frame-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.totalWidth} ${m.totalHeight}" role="presentation" aria-hidden="true"><rect width="${m.totalWidth}" height="${m.totalHeight}" rx="${m.cornerR}" fill="${QR_BRAND_LIGHT}"/><rect x="${m.border / 2}" y="${m.border / 2}" width="${m.totalWidth - m.border}" height="${m.totalHeight - m.border}" rx="${m.cornerR - 1}" fill="none" stroke="${QR_BRAND_RED}" stroke-width="${m.border}"/>${glyph}<g transform="translate(${m.qrX} ${m.qrY})">${inner}</g>${pillText}${footerText}</svg>`;
}

/**
 * HTML wrapper for Worker / static embeds.
 * @param {string} brandedQrSvg
 * @param {{ ariaLabel?: string, showLiveObject?: boolean }} [opts]
 */
export function renderHumanityQrFrameMarkup(brandedQrSvg, opts = {}) {
  const framed = renderHumanityQrFrameSvg(brandedQrSvg, opts);
  const label = opts.ariaLabel ?? "Humanity live object QR code";
  return `<div class="hc-qr-frame pass-qr-svg" role="img" aria-label="${label}">${framed}</div>`;
}

/**
 * Draw network glyph on canvas at absolute coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} size
 * @param {number} [opacity]
 */
export function drawNetworkGlyphOnCanvas(ctx, cx, cy, size, opacity = 0.88) {
  const outerR = size / 2;
  const innerR = outerR * QR_CENTER_LOGO_INNER_RADIUS_RATIO;
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

/**
 * Draw frame chrome and invoke drawQr to place the code.
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof qrFrameMetrics>} m
 * @param {() => void} drawQr
 */
export function drawHumanityQrFrameCanvas(ctx, m, drawQr) {
  const { totalWidth, totalHeight, cornerR, border } = m;
  ctx.fillStyle = QR_BRAND_LIGHT;
  roundRect(ctx, 0, 0, totalWidth, totalHeight, cornerR);
  ctx.fill();
  ctx.strokeStyle = QR_BRAND_RED;
  ctx.lineWidth = border;
  roundRect(
    ctx,
    border / 2,
    border / 2,
    totalWidth - border,
    totalHeight - border,
    Math.max(1, cornerR - 1)
  );
  ctx.stroke();
  drawNetworkGlyphOnCanvas(ctx, m.glyphCx, m.glyphCy, m.glyphSize);
  drawQr();
  ctx.fillStyle = QR_BRAND_RED;
  ctx.font = `600 ${m.pillFont}px system-ui,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const pillMidY = m.pillY + m.pillH / 2;
  ctx.fillText(QR_FRAME_LIVE_OBJECT_TEXT, m.innerW / 2, pillMidY);
  ctx.fillStyle = QR_FRAME_FOOTER_FILL;
  ctx.font = `500 ${m.footerFont}px system-ui,sans-serif`;
  ctx.fillText(QR_FRAME_FOOTER_TEXT, m.innerW / 2, m.footerY + m.footerH / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

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
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO,
  offsetX = 0,
  offsetY = 0
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrWidth, sizeRatio);
  const drawCx = cx + offsetX;
  const drawCy = cy + offsetY;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(drawCx, drawCy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_OUTER_FILL;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(drawCx, drawCy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_INNER_FILL;
  ctx.fill();
  ctx.restore();
}

/**
 * Branded QR with signed visual frame on one canvas (browser PNG export).
 * @param {string} text
 * @param {number} qrWidth module square size in px
 */
export async function renderHumanityQrFrameToCanvas(text, qrWidth) {
  const { assertOfficialScanUrl } = await import("./qr-scan-url-lock.mjs");
  assertOfficialScanUrl(text);
  const qrCanvas = document.createElement("canvas");
  const QRCode = (await import("./vendor/qrcode.mjs")).default;
  await QRCode.toCanvas(qrCanvas, text, { ...QR_BRANDED_RENDER_OPTIONS, width: qrWidth });
  const m = qrFrameMetrics(qrWidth);
  const out = document.createElement("canvas");
  out.width = m.totalWidth;
  out.height = m.totalHeight;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  drawHumanityQrFrameCanvas(ctx, m, () => {
    ctx.drawImage(qrCanvas, m.qrX, m.qrY);
    drawCenterLogoOnCanvas(ctx, qrWidth, QR_CENTER_LOGO_OPACITY, QR_CENTER_LOGO_SIZE_RATIO, m.qrX, m.qrY);
  });
  return out;
}

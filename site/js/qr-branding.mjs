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

/** Warm ink inner core - contrasts with brand-red modules and dusty outer wash. */
export const QR_CENTER_LOGO_INNER_FILL = "#141414";

/** Inner radius as fraction of outer radius (small brand core on large soft wash). */
export const QR_CENTER_LOGO_INNER_RADIUS_RATIO = 0.46;

/** Soft dusty-rose wash on dark modules only (docs/QR_BRANDING.md). */
export const QR_CENTER_LOGO_OUTER_OPACITY = 0.52;

/** Ink core on dark modules - higher opacity so the bullseye reads at a glance. */
export const QR_CENTER_LOGO_INNER_OPACITY = 0.9;

/** @deprecated Prefer {@link QR_CENTER_LOGO_OUTER_OPACITY} / {@link QR_CENTER_LOGO_INNER_OPACITY}. */
export const QR_CENTER_LOGO_OPACITY = QR_CENTER_LOGO_OUTER_OPACITY;

/** Outer circle diameter as fraction of QR width (center mark; off when using finder mark). */
export const QR_CENTER_LOGO_SIZE_RATIO = 0.78;

/** Two-tone mark over the top-left finder (~7 modules). */
export const QR_FINDER_LOGO_SIZE_RATIO = 0.21;

/** Center bullseye off; two-tone mark sits on the top-left finder only. */
export const QR_CENTER_LOGO_ENABLED = false;

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

/** @deprecated Frame-margin dot removed; mark is on the QR finder. */
export const QR_FRAME_BRAND_MARK_OPACITY = 0.34;

/** Do not paint on the card border margin. */
export const QR_FRAME_BRAND_MARK_ENABLED = false;

/**
 * Layout around the QR modules (not including outer canvas margin).
 * @param {number} qrSize
 * @param {{ credentialCode?: string | null }} [opts]
 */
export function qrFrameMetrics(qrSize, opts = {}) {
  const pad = Math.max(4, Math.round(qrSize * 0.045));
  const border = Math.max(1.5, qrSize * 0.011);
  const gap = Math.max(2, Math.round(qrSize * 0.022));
  const pillH = Math.max(9, Math.round(qrSize * 0.068));
  const footerH = Math.max(10, Math.round(qrSize * 0.072));
  const qrX = pad + border;
  const qrY = pad + border;
  const marginCorner = qrX;
  const glyphSize = Math.max(
    4,
    Math.min(Math.round(qrSize * 0.09), Math.floor(marginCorner * 0.82))
  );
  const innerW = qrSize + 2 * (pad + border);
  const pillY = qrY + qrSize + gap;
  const footerY = pillY + pillH + gap;
  const hasCode = Boolean(opts.credentialCode);
  const codeH = hasCode ? Math.max(8, Math.round(qrSize * 0.06)) : 0;
  const codeY = footerY + footerH + gap;
  const totalHeight = (hasCode ? codeY + codeH : footerY + footerH) + pad;
  // Keep the mark inside the white margin square so it never stacks on the QR finder.
  const glyphCx = marginCorner * 0.48;
  const glyphCy = marginCorner * 0.48;
  const pillFont = Math.max(5.5, qrSize * 0.062);
  const footerFont = Math.max(5, qrSize * 0.058);
  const codeFont = Math.max(5, qrSize * 0.056);
  const cornerR = Math.max(3, qrSize * 0.04);
  return {
    qrSize,
    pad,
    border,
    gap,
    pillH,
    footerH,
    codeH,
    codeY,
    credentialCode: opts.credentialCode ?? null,
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
    codeFont,
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
 * Soft transparent brand-red dot in the frame margin (reference: favicon / red_qr_transparent_bg.png).
 * @param {number} size bounding box edge
 * @param {number} cx
 * @param {number} cy
 * @param {number} [opacity]
 */
export function brandMarkGlyphSvgFragment(size, cx, cy, opacity = QR_FRAME_BRAND_MARK_OPACITY) {
  const r = size / 2;
  return `<g class="hc-qr-brand-mark" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${QR_BRAND_RED}" opacity="${opacity}"/></g>`;
}

/**
 * @deprecated Use {@link brandMarkGlyphSvgFragment}.
 */
export function networkGlyphSvgFragment(size, cx, cy, opacity = QR_FRAME_BRAND_MARK_OPACITY) {
  return brandMarkGlyphSvgFragment(size, cx, cy, opacity);
}

/**
 * Wrap branded QR SVG in the signed visual frame (border, glyph, LIVE OBJECT, footer).
 * @param {string} brandedQrSvg QR SVG with center logo already applied
 * @param {{ showLiveObject?: boolean, credentialCode?: string | null }} [opts]
 */
export function renderHumanityQrFrameSvg(brandedQrSvg, opts = {}) {
  const qrSize = extractQrSvgViewBoxSize(brandedQrSvg);
  if (!qrSize || !brandedQrSvg?.includes("</svg>")) return brandedQrSvg;
  const m = qrFrameMetrics(qrSize, { credentialCode: opts.credentialCode });
  const inner = extractSvgInner(brandedQrSvg);
  const showLiveObject = opts.showLiveObject !== false;
  const glyph = QR_FRAME_BRAND_MARK_ENABLED
    ? brandMarkGlyphSvgFragment(m.glyphSize, m.glyphCx, m.glyphCy)
    : "";
  const pillText = showLiveObject
    ? `<text class="hc-qr-frame-pill-text" x="${m.innerW / 2}" y="${m.pillY + m.pillH * 0.72}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${m.pillFont}" font-weight="600" letter-spacing="0.14em" fill="${QR_BRAND_RED}">${QR_FRAME_LIVE_OBJECT_TEXT}</text>`
    : "";
  const footerText = `<text class="hc-qr-frame-footer-text" x="${m.innerW / 2}" y="${m.footerY + m.footerH * 0.75}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${m.footerFont}" font-weight="500" fill="${QR_FRAME_FOOTER_FILL}">${QR_FRAME_FOOTER_TEXT}</text>`;
  const codeText = m.credentialCode
    ? `<text class="hc-qr-frame-code-text" x="${m.innerW / 2}" y="${m.codeY + m.codeH * 0.72}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${m.codeFont}" font-weight="600" letter-spacing="0.08em" fill="${QR_BRAND_RED}">${m.credentialCode}</text>`
    : "";
  // Slightly inset the stroke so parent containers with rounded corners don't clip.
  const strokeInset = Math.max(0.25, m.border * 0.35);
  const strokeX = m.border / 2 + strokeInset;
  const strokeY = m.border / 2 + strokeInset;
  const strokeW = m.totalWidth - m.border - 2 * strokeInset;
  const strokeH = m.totalHeight - m.border - 2 * strokeInset;
  const strokeR = Math.max(0, m.cornerR - strokeInset);

  return `<svg class="hc-qr-frame-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.totalWidth} ${m.totalHeight}" role="presentation" aria-hidden="true"><rect width="${m.totalWidth}" height="${m.totalHeight}" rx="${m.cornerR}" fill="${QR_BRAND_LIGHT}"/><rect x="${strokeX}" y="${strokeY}" width="${strokeW}" height="${strokeH}" rx="${strokeR}" fill="none" stroke="${QR_BRAND_RED}" stroke-width="${m.border}"/>${glyph}<g transform="translate(${m.qrX} ${m.qrY})">${inner}</g>${pillText}${footerText}${codeText}</svg>`;
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
 * Draw soft transparent brand-red corner dot on canvas (frame margin only).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} size
 * @param {number} [opacity]
 */
export function drawBrandMarkGlyphOnCanvas(ctx, cx, cy, size, opacity = QR_FRAME_BRAND_MARK_OPACITY) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = QR_BRAND_RED;
  ctx.fill();
  ctx.restore();
}

/**
 * @deprecated Use {@link drawBrandMarkGlyphOnCanvas}.
 */
export function drawNetworkGlyphOnCanvas(ctx, cx, cy, size, opacity = QR_FRAME_BRAND_MARK_OPACITY) {
  drawBrandMarkGlyphOnCanvas(ctx, cx, cy, size, opacity);
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

  // Slightly inset the stroke so parent rounded containers don't clip the outermost pixels.
  const strokeInset = Math.max(0.25, border * 0.35);
  roundRect(
    ctx,
    border / 2 + strokeInset,
    border / 2 + strokeInset,
    totalWidth - border - 2 * strokeInset,
    totalHeight - border - 2 * strokeInset,
    Math.max(1, cornerR - strokeInset)
  );
  ctx.stroke();
  if (QR_FRAME_BRAND_MARK_ENABLED) {
    drawBrandMarkGlyphOnCanvas(ctx, m.glyphCx, m.glyphCy, m.glyphSize);
  }
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
  if (m.credentialCode) {
    ctx.fillStyle = QR_BRAND_RED;
    ctx.font = `600 ${m.codeFont}px ui-monospace,monospace`;
    ctx.fillText(m.credentialCode, m.innerW / 2, m.codeY + m.codeH / 2);
  }
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
 * Top-left finder center in QR viewBox units (ISO 7x7 finder at quiet zone + 3.5).
 * @param {number} viewBoxSize
 * @param {number} [sizeRatio]
 * @param {number} [marginModules]
 */
export function finderLogoMetrics(
  viewBoxSize,
  sizeRatio = QR_FINDER_LOGO_SIZE_RATIO,
  marginModules = QR_BRANDED_RENDER_OPTIONS.margin
) {
  const logoSize = viewBoxSize * sizeRatio;
  const cx = marginModules + 3.5;
  const cy = marginModules + 3.5;
  const outerR = logoSize / 2;
  const innerR = outerR * QR_CENTER_LOGO_INNER_RADIUS_RATIO;
  return { logoSize, cx, cy, outerR, innerR, viewBoxSize };
}

/**
 * Finder mark position scaled to canvas pixels.
 * @param {number} canvasSize
 * @param {number} viewBoxSize
 * @param {number} [sizeRatio]
 */
export function finderLogoMetricsPixels(
  canvasSize,
  viewBoxSize,
  sizeRatio = QR_FINDER_LOGO_SIZE_RATIO
) {
  const m = finderLogoMetrics(viewBoxSize, sizeRatio);
  const scale = canvasSize / viewBoxSize;
  return {
    cx: m.cx * scale,
    cy: m.cy * scale,
    outerR: m.outerR * scale,
    innerR: m.innerR * scale,
  };
}

/**
 * Dusty-rose + ink concentric circles (original two-tone mark).
 * @param {number} cx
 * @param {number} cy
 * @param {number} outerR
 * @param {number} innerR
 * @param {string} className
 * @param {number} outerOpacity
 * @param {number} innerOpacity
 */
export function twoToneLogoSvgFragment(
  cx,
  cy,
  outerR,
  innerR,
  className,
  outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
  innerOpacity = QR_CENTER_LOGO_INNER_OPACITY
) {
  return `<g class="${className}" aria-hidden="true"><circle class="${className}-outer" cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}" opacity="${outerOpacity}"/><circle class="${className}-inner" cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}" opacity="${innerOpacity}"/></g>`;
}

/**
 * @param {number} qrSize
 */
export function finderLogoSvgFragment(
  qrSize,
  outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
  innerOpacity = QR_CENTER_LOGO_INNER_OPACITY,
  sizeRatio = QR_FINDER_LOGO_SIZE_RATIO
) {
  const { cx, cy, outerR, innerR } = finderLogoMetrics(qrSize, sizeRatio);
  return twoToneLogoSvgFragment(cx, cy, outerR, innerR, "hc-qr-finder-logo", outerOpacity, innerOpacity);
}

/**
 * Inline SVG fragment: two concentric circles, transparent outside the rings.
 * @param {number} qrSize
 * @param {number} [opacity]
 * @param {number} [sizeRatio]
 */
export function centerLogoSvgFragment(
  qrSize,
  outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO,
  innerOpacity = QR_CENTER_LOGO_INNER_OPACITY
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrSize, sizeRatio);
  return twoToneLogoSvgFragment(cx, cy, outerR, innerR, "hc-qr-center-logo", outerOpacity, innerOpacity);
}

/**
 * Module-masked two-tone mark on the top-left QR finder.
 * @param {string} svg
 * @param {{ opacity?: number, sizeRatio?: number, outerOpacity?: number, innerOpacity?: number }} [opts]
 */
export function overlayFinderLogoOnSvg(svg, opts = {}) {
  if (!svg?.includes("</svg>")) return svg;
  const outerOpacity = opts.outerOpacity ?? opts.opacity ?? QR_CENTER_LOGO_OUTER_OPACITY;
  const innerOpacity = opts.innerOpacity ?? QR_CENTER_LOGO_INNER_OPACITY;
  const sizeRatio = opts.sizeRatio ?? QR_FINDER_LOGO_SIZE_RATIO;
  const marginModules = opts.margin ?? QR_BRANDED_RENDER_OPTIONS.margin;
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch
    ? Number(viewBoxMatch[1])
    : widthMatch
      ? Number(widthMatch[1])
      : 0;
  if (!size) return svg;

  const maskId = `hc-qr-finder-logo-mask-${Math.random().toString(36).slice(2)}`;
  const inner = extractSvgInner(svg);
  const darkModulePaths = inner.match(new RegExp(`<path[^>]*stroke="${QR_BRAND_RED}"[^>]*/>`, "g")) ?? [];
  const { cx, cy, outerR, innerR } = finderLogoMetrics(size, sizeRatio, marginModules);

  if (!darkModulePaths.length) {
    const { cx: fcx, cy: fcy, outerR: outerRf, innerR: innerRf } = finderLogoMetrics(
      size,
      sizeRatio,
      marginModules
    );
    const fragment = twoToneLogoSvgFragment(
      fcx,
      fcy,
      outerRf,
      innerRf,
      "hc-qr-finder-logo",
      outerOpacity,
      innerOpacity
    );
    return svg.replace("</svg>", `${fragment}</svg>`);
  }

  const circleFragment = `<g class="hc-qr-finder-logo" aria-hidden="true" mask="url(#${maskId})"><circle class="hc-qr-finder-logo-outer" cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}" opacity="${outerOpacity}"/><circle class="hc-qr-finder-logo-inner" cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}" opacity="${innerOpacity}"/></g>`;
  const defs = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" mask-type="alpha">${darkModulePaths.join("")}</mask></defs>`;
  return svg.replace("</svg>", `${defs}${circleFragment}</svg>`);
}

/**
 * Branded QR overlay: two-tone finder mark (module-masked). Center mark optional via flag.
 * @param {string} svg
 * @param {{ opacity?: number, sizeRatio?: number }} [opts]
 */
export function overlayCenterLogoOnSvg(svg, opts = {}) {
  if (!svg?.includes("</svg>")) return svg;
  let out = overlayFinderLogoOnSvg(svg, opts);
  if (!QR_CENTER_LOGO_ENABLED) return out;

  const outerOpacity = opts.outerOpacity ?? opts.opacity ?? QR_CENTER_LOGO_OUTER_OPACITY;
  const innerOpacity = opts.innerOpacity ?? QR_CENTER_LOGO_INNER_OPACITY;
  const sizeRatio = opts.sizeRatio ?? QR_CENTER_LOGO_SIZE_RATIO;
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
  if (!size) return out;

  const maskId = `hc-qr-center-logo-mask-${Math.random().toString(36).slice(2)}`;
  const inner = extractSvgInner(svg);
  const darkModulePaths = inner.match(new RegExp(`<path[^>]*stroke="${QR_BRAND_RED}"[^>]*/>`, "g")) ?? [];
  const { cx, cy, outerR, innerR } = centerLogoMetrics(size, sizeRatio);
  const circleFragment = `<g class="hc-qr-center-logo" aria-hidden="true" mask="url(#${maskId})"><circle class="hc-qr-center-logo-outer" cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}" opacity="${outerOpacity}"/><circle class="hc-qr-center-logo-inner" cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}" opacity="${innerOpacity}"/></g>`;
  if (!darkModulePaths.length) {
    return out.replace("</svg>", `${centerLogoSvgFragment(size, outerOpacity, sizeRatio, innerOpacity)}</svg>`);
  }
  const defs = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" mask-type="alpha">${darkModulePaths.join("")}</mask></defs>`;
  return out.replace("</svg>", `${defs}${circleFragment}</svg>`);
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
  outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO,
  offsetX = 0,
  offsetY = 0,
  innerOpacity = QR_CENTER_LOGO_INNER_OPACITY
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrWidth, sizeRatio);
  const drawCx = cx + offsetX;
  const drawCy = cy + offsetY;
  ctx.save();
  ctx.globalAlpha = outerOpacity;
  ctx.beginPath();
  ctx.arc(drawCx, drawCy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_OUTER_FILL;
  ctx.fill();
  ctx.globalAlpha = innerOpacity;
  ctx.beginPath();
  ctx.arc(drawCx, drawCy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = QR_CENTER_LOGO_INNER_FILL;
  ctx.fill();
  ctx.restore();
}

/**
 * Module-masked two-tone circles at a given center (finder or code center).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} qrCanvas
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {{ cx: number, cy: number, outerR: number, innerR: number, outerOpacity?: number, innerOpacity?: number }} mark
 */
export function drawMaskedTwoToneLogoOnCanvas(ctx, qrCanvas, offsetX, offsetY, mark) {
  const qrCtx = qrCanvas.getContext("2d");
  if (!qrCtx) return;

  const w = qrCanvas.width;
  const h = qrCanvas.height;
  const {
    cx,
    cy,
    outerR,
    innerR,
    outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
    innerOpacity = QR_CENTER_LOGO_INNER_OPACITY,
  } = mark;

  const circleCanvas = document.createElement("canvas");
  circleCanvas.width = w;
  circleCanvas.height = h;
  const circleCtx = circleCanvas.getContext("2d");
  if (!circleCtx) return;

  circleCtx.save();
  circleCtx.globalAlpha = outerOpacity;
  circleCtx.beginPath();
  circleCtx.arc(cx, cy, outerR, 0, Math.PI * 2);
  circleCtx.fillStyle = QR_CENTER_LOGO_OUTER_FILL;
  circleCtx.fill();
  circleCtx.globalAlpha = innerOpacity;
  circleCtx.beginPath();
  circleCtx.arc(cx, cy, innerR, 0, Math.PI * 2);
  circleCtx.fillStyle = QR_CENTER_LOGO_INNER_FILL;
  circleCtx.fill();
  circleCtx.restore();

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return;

  const qrImage = qrCtx.getImageData(0, 0, w, h);
  const maskImage = maskCtx.createImageData(w, h);
  const qrData = qrImage.data;
  const maskData = maskImage.data;
  const red = hexToRgb(QR_BRAND_RED);
  const maxDistSq = 1800;

  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const r = qrData[p];
    const g = qrData[p + 1];
    const b = qrData[p + 2];
    const a = qrData[p + 3];
    const dr = r - red.r;
    const dg = g - red.g;
    const db = b - red.b;
    const distSq = dr * dr + dg * dg + db * db;
    const isDarkModule = a > 128 && distSq <= maxDistSq;
    const on = isDarkModule ? 255 : 0;
    maskData[p] = on;
    maskData[p + 1] = on;
    maskData[p + 2] = on;
    maskData[p + 3] = on;
  }
  maskCtx.putImageData(maskImage, 0, 0);

  circleCtx.globalCompositeOperation = "destination-in";
  circleCtx.drawImage(maskCanvas, 0, 0);
  circleCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(circleCanvas, offsetX, offsetY);
}

/**
 * @deprecated Use {@link drawMaskedTwoToneLogoOnCanvas} on the finder.
 */
export function drawMaskedCenterLogoOnCanvas(
  ctx,
  qrCanvas,
  qrWidth,
  offsetX = 0,
  offsetY = 0,
  outerOpacity = QR_CENTER_LOGO_OUTER_OPACITY,
  sizeRatio = QR_CENTER_LOGO_SIZE_RATIO,
  innerOpacity = QR_CENTER_LOGO_INNER_OPACITY
) {
  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrCanvas.width, sizeRatio);
  drawMaskedTwoToneLogoOnCanvas(ctx, qrCanvas, offsetX, offsetY, {
    cx,
    cy,
    outerR,
    innerR,
    outerOpacity,
    innerOpacity,
  });
}

/**
 * Two-tone mark on the top-left finder (module-masked).
 */
export function drawMaskedFinderLogoOnCanvas(ctx, qrCanvas, offsetX, offsetY, viewBoxSize) {
  const w = qrCanvas.width;
  const vb = viewBoxSize ?? w;
  const mark = finderLogoMetricsPixels(w, vb);
  drawMaskedTwoToneLogoOnCanvas(ctx, qrCanvas, offsetX, offsetY, mark);
}

function hexToRgb(hex) {
  const h = String(hex).replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
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
  // Ensure we never render transparent "quiet zone" pixels through the network glyph.
  // (qrcode's light background behavior can differ across renderers, and we want opacity.)
  const qrCtx = qrCanvas.getContext("2d");
  if (qrCtx) {
    qrCtx.save();
    qrCtx.globalCompositeOperation = "destination-over";
    qrCtx.fillStyle = QR_BRAND_LIGHT;
    qrCtx.fillRect(0, 0, qrWidth, qrWidth);
    qrCtx.restore();
  }
  const { credentialCodeFromScanUrl } = await import("./qr-credential-code.mjs");
  const m = qrFrameMetrics(qrWidth, {
    credentialCode: credentialCodeFromScanUrl(text),
  });
  // The created-page preview rounds the `<img>` element with a fixed border-radius,
  // which can clip artwork that touches the canvas edges. Add "quiet padding"
  // around the whole frame so the red stroke + corner glyph remain fully visible.
  const outerPadding = Math.max(8, Math.round(qrWidth * 0.09));
  const out = document.createElement("canvas");
  out.width = m.totalWidth + 2 * outerPadding;
  out.height = m.totalHeight + 2 * outerPadding;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.save();
  ctx.fillStyle = QR_BRAND_LIGHT;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(outerPadding, outerPadding);
  const viewBoxSize = extractQrSvgViewBoxSize(
    await QRCode.toString(text, { type: "svg", ...QR_BRANDED_RENDER_OPTIONS, width: qrWidth })
  );

  drawHumanityQrFrameCanvas(ctx, m, () => {
    ctx.drawImage(qrCanvas, m.qrX, m.qrY);
    drawMaskedFinderLogoOnCanvas(ctx, qrCanvas, m.qrX, m.qrY, viewBoxSize || qrWidth);
    if (QR_CENTER_LOGO_ENABLED) {
      const { cx, cy, outerR, innerR } = centerLogoMetrics(qrWidth);
      drawMaskedTwoToneLogoOnCanvas(ctx, qrCanvas, m.qrX, m.qrY, {
        cx,
        cy,
        outerR,
        innerR,
      });
    }
  });
  ctx.restore();
  return out;
}

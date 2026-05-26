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

/** Warm ink inner core — contrasts with brand-red modules and dusty outer wash. */
export const QR_CENTER_LOGO_INNER_FILL = "#141414";

/** Inner radius as fraction of outer radius (small brand core on large soft wash). */
export const QR_CENTER_LOGO_INNER_RADIUS_RATIO = 0.46;

/** Soft dusty-rose wash on dark modules only (docs/QR_BRANDING.md). */
export const QR_CENTER_LOGO_OUTER_OPACITY = 0.52;

/** Ink core on dark modules — higher opacity so the bullseye reads at a glance. */
export const QR_CENTER_LOGO_INNER_OPACITY = 0.9;

/** @deprecated Prefer {@link QR_CENTER_LOGO_OUTER_OPACITY} / {@link QR_CENTER_LOGO_INNER_OPACITY}. */
export const QR_CENTER_LOGO_OPACITY = QR_CENTER_LOGO_OUTER_OPACITY;

/** Outer circle diameter as fraction of QR width (~fills code, stays inside frame). */
export const QR_CENTER_LOGO_SIZE_RATIO = 0.78;

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
 * @param {{ credentialCode?: string | null }} [opts]
 */
export function qrFrameMetrics(qrSize, opts = {}) {
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
  const hasCode = Boolean(opts.credentialCode);
  const codeH = hasCode ? Math.max(8, Math.round(qrSize * 0.06)) : 0;
  const codeY = footerY + footerH + gap;
  const totalHeight = (hasCode ? codeY + codeH : footerY + footerH) + pad;
  const glyphCx = pad + glyphSize / 2 + 1;
  const glyphCy = pad + glyphSize / 2 + 1;
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
 * @param {{ showLiveObject?: boolean, credentialCode?: string | null }} [opts]
 */
export function renderHumanityQrFrameSvg(brandedQrSvg, opts = {}) {
  const qrSize = extractQrSvgViewBoxSize(brandedQrSvg);
  if (!qrSize || !brandedQrSvg?.includes("</svg>")) return brandedQrSvg;
  const m = qrFrameMetrics(qrSize, { credentialCode: opts.credentialCode });
  const inner = extractSvgInner(brandedQrSvg);
  const showLiveObject = opts.showLiveObject !== false;
  const glyph = networkGlyphSvgFragment(m.glyphSize, m.glyphCx, m.glyphCy);
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

  return `<svg class="hc-qr-frame-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.totalWidth} ${m.totalHeight}" role="presentation" aria-hidden="true"><rect width="${m.totalWidth}" height="${m.totalHeight}" rx="${m.cornerR}" fill="${QR_BRAND_LIGHT}"/><rect x="${strokeX}" y="${strokeY}" width="${strokeW}" height="${strokeH}" rx="${strokeR}" fill="none" stroke="${QR_BRAND_RED}" stroke-width="${m.border}"/><g transform="translate(${m.qrX} ${m.qrY})">${inner}</g>${glyph}${pillText}${footerText}${codeText}</svg>`;
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
  drawQr();
  // Draw glyph on top of the QR modules to avoid any "shadow" leftovers from QR background compositing.
  drawNetworkGlyphOnCanvas(ctx, m.glyphCx, m.glyphCy, m.glyphSize);
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
  return `<g class="hc-qr-center-logo" aria-hidden="true"><circle class="hc-qr-center-logo-outer" cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}" opacity="${outerOpacity}"/><circle class="hc-qr-center-logo-inner" cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}" opacity="${innerOpacity}"/></g>`;
}

/**
 * Insert centered vector logo into a QR SVG string.
 * @param {string} svg
 * @param {{ opacity?: number, sizeRatio?: number }} [opts]
 */
export function overlayCenterLogoOnSvg(svg, opts = {}) {
  if (!svg?.includes("</svg>")) return svg;
  const outerOpacity = opts.outerOpacity ?? opts.opacity ?? QR_CENTER_LOGO_OUTER_OPACITY;
  const innerOpacity = opts.innerOpacity ?? QR_CENTER_LOGO_INNER_OPACITY;
  const sizeRatio = opts.sizeRatio ?? QR_CENTER_LOGO_SIZE_RATIO;
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
  const size = viewBoxMatch
    ? Number(viewBoxMatch[1])
    : widthMatch
      ? Number(widthMatch[1])
      : 0;
  if (!size) return svg;
  // Mask the center mark so it only renders on top of the dark QR modules
  // (leaves QR whitespace / negative space intact).
  const maskId = `hc-qr-center-logo-mask-${Math.random().toString(36).slice(2)}`;
  const inner = extractSvgInner(svg);
  const darkModulePaths = inner.match(new RegExp(`<path[^>]*stroke="${QR_BRAND_RED}"[^>]*/>`, "g")) ?? [];
  if (!darkModulePaths.length) {
    const fragment = centerLogoSvgFragment(size, outerOpacity, sizeRatio, innerOpacity);
    return svg.replace("</svg>", `${fragment}</svg>`);
  }

  const { cx, cy, outerR, innerR } = centerLogoMetrics(size, sizeRatio);
  const circleFragment = `<g class="hc-qr-center-logo" aria-hidden="true" mask="url(#${maskId})"><circle class="hc-qr-center-logo-outer" cx="${cx}" cy="${cy}" r="${outerR}" fill="${QR_CENTER_LOGO_OUTER_FILL}" opacity="${outerOpacity}"/><circle class="hc-qr-center-logo-inner" cx="${cx}" cy="${cy}" r="${innerR}" fill="${QR_CENTER_LOGO_INNER_FILL}" opacity="${innerOpacity}"/></g>`;

  const defs = `<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" mask-type="alpha">${darkModulePaths.join("")}</mask></defs>`;
  return svg.replace("</svg>", `${defs}${circleFragment}</svg>`);
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
 * Like drawCenterLogoOnCanvas, but masks the mark to only render over dark QR modules.
 *
 * This keeps the "circle silhouette" while leaving QR whitespace modules unchanged,
 * improving visual contrast and scan robustness.
 * @param {CanvasRenderingContext2D} ctx Output canvas context
 * @param {HTMLCanvasElement} qrCanvas QR canvas (must already contain rendered modules)
 * @param {number} qrWidth
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {number} [outerOpacity]
 * @param {number} [sizeRatio]
 * @param {number} [innerOpacity]
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
  const qrCtx = qrCanvas.getContext("2d");
  if (!qrCtx) return;

  const { cx, cy, outerR, innerR } = centerLogoMetrics(qrWidth, sizeRatio);

  // Build a mask from "dark module" pixels in the QR canvas.
  const qrImage = qrCtx.getImageData(0, 0, qrWidth, qrWidth);
  const qrData = qrImage.data;

  const red = hexToRgb(QR_BRAND_RED);
  const circleCanvas = document.createElement("canvas");
  circleCanvas.width = qrWidth;
  circleCanvas.height = qrWidth;
  const circleCtx = circleCanvas.getContext("2d");
  if (!circleCtx) return;

  // Draw the full circles first; we will then punch holes using the QR-mask.
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

  const circleImage = circleCtx.getImageData(0, 0, qrWidth, qrWidth);
  const circleData = circleImage.data;

  // Threshold based on distance to the exact brand red.
  // (QR code rasterization is crispEdges so this is usually exact, but we allow minor anti-aliasing.)
  const maxDistSq = 1800; // empirically tolerant for edge pixels
  for (let i = 0; i < qrWidth * qrWidth; i++) {
    const p = i * 4;
    const r = qrData[p];
    const g = qrData[p + 1];
    const b = qrData[p + 2];
    const a = qrData[p + 3];

    const dr = r - red.r;
    const dg = g - red.g;
    const db = b - red.b;
    const distSq = dr * dr + dg * dg + db * db;

    const isDarkModule = a > 0 && distSq <= maxDistSq;
    if (!isDarkModule) {
      // Keep RGB, but fully hide outside-module pixels.
      circleData[p + 3] = 0;
    }
  }

  circleCtx.putImageData(circleImage, 0, 0);
  ctx.drawImage(circleCanvas, offsetX, offsetY);
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
  const out = document.createElement("canvas");
  out.width = m.totalWidth;
  out.height = m.totalHeight;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  drawHumanityQrFrameCanvas(ctx, m, () => {
    ctx.drawImage(qrCanvas, m.qrX, m.qrY);
    drawMaskedCenterLogoOnCanvas(
      ctx,
      qrCanvas,
      qrWidth,
      m.qrX,
      m.qrY,
      QR_CENTER_LOGO_OUTER_OPACITY,
      QR_CENTER_LOGO_SIZE_RATIO,
      QR_CENTER_LOGO_INNER_OPACITY
    );
  });
  return out;
}

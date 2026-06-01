/**
 * Square sticker Printify mock art — digital-register QR + ink hint label.
 * @see docs/QR_BRANDING.md · docs/MERCH_PERSONALIZED_STICKER_SETUP.md
 */

import { extractSvgInner } from "./qr-branding.mjs";

/** Preview ink-hint copy (site/styles.css .shop-customize-mock__ink-hint). */
export const STICKER_INK_HINT_TEXT = "UPDATES FROM YOUR PHONE";

export const STICKER_INK_HINT_FILL = "#db1b43";

export const STICKER_INK_HINT_OPACITY = 0.78;

export const STICKER_INK_HINT_LETTER_SPACING_EM = 0.06;

/** Default operator export path (npm run print:sticker-printify-pngs). */
export const STICKER_PRINTIFY_MOCK_ART_PATH =
  "/images/merch/printify-art/sticker-live-object-updates-from-phone.png";

/**
 * @param {string} framedQrSvg digital-register output of renderFramedScanQrSvg()
 * @param {number} canvasSize square px (Printify 2×2 in mock at ~1200 dpi)
 */
export function renderStickerPrintifyMockSvg(framedQrSvg, canvasSize = 2400) {
  const viewBoxMatch = framedQrSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const framedW = viewBoxMatch ? Number(viewBoxMatch[1]) : 58;
  const framedH = viewBoxMatch ? Number(viewBoxMatch[2]) : 89.5;
  if (!framedW || !framedQrSvg?.includes("</svg>")) {
    throw new Error("Invalid framed QR SVG for sticker mockup");
  }

  const cardInset = canvasSize * 0.06;
  const cardSize = canvasSize - 2 * cardInset;
  const cardR = cardSize * 0.058;
  const hintGap = canvasSize * 0.018;
  const hintFont = Math.max(18, Math.round(canvasSize * 0.028));
  const hintBlock = hintFont * 1.5;

  const contentW = cardSize * 0.88;
  const maxQrH = cardSize * 0.82 - hintBlock - hintGap;
  const scale = Math.min(contentW / framedW, maxQrH / framedH);
  const placedW = framedW * scale;
  const placedH = framedH * scale;

  const cardX = cardInset;
  const cardY = cardInset;
  const qrX = cardX + (cardSize - placedW) / 2;
  const qrY = cardY + (cardSize - placedH - hintBlock - hintGap) / 2;
  const hintY = qrY + placedH + hintGap + hintFont * 0.85;
  const hintX = cardX + cardSize / 2;

  const inner = extractSvgInner(framedQrSvg);
  const letterSpacing = hintFont * STICKER_INK_HINT_LETTER_SPACING_EM;

  return `<svg class="hc-sticker-printify-mock-svg" xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" role="img" aria-label="Humanity sticker mockup with live object QR"><rect width="${canvasSize}" height="${canvasSize}" fill="#ffffff"/><rect x="${cardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="${cardR}" fill="#ffffff" stroke="rgba(0,0,0,0.06)" stroke-width="${Math.max(1, canvasSize * 0.001)}"/><g class="hc-sticker-printify-mock-qr" transform="translate(${qrX} ${qrY}) scale(${scale})">${inner}</g><text class="hc-sticker-printify-mock-ink-hint" x="${hintX}" y="${hintY}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${hintFont}" font-weight="600" letter-spacing="${letterSpacing}" fill="${STICKER_INK_HINT_FILL}" opacity="${STICKER_INK_HINT_OPACITY}">${STICKER_INK_HINT_TEXT}</text></svg>`;
}

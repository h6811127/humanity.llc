/**
 * Print sticker sheet layout (docs/SCANNER_EXPERIENCE.md Phase D).
 * Wraps the signed QR frame in trim/bleed/safe zones for vendor print.
 */

import { extractQrSvgViewBoxSize, extractSvgInner } from "./qr-branding.mjs";
import { CREDENTIAL_CODE_PATTERN } from "./qr-credential-code.mjs";
import { applyPrintQaWatermark } from "./qr-print-qa-watermark.mjs";

/** Finished sticker trim - 2 in square (founding drop default). */
export const STICKER_TRIM_MM = 50.8;

/** Bleed beyond trim for die-cut / full-bleed print. */
export const STICKER_BLEED_MM = 1.5;

/** Keep framed QR inside this inset from trim edge. */
export const STICKER_SAFE_INSET_MM = 2;

/** Minimum QR module area width on trim (Technical Standards §8.5). */
export const STICKER_MIN_QR_ON_TRIM_MM = 28;

const MM_PER_IN = 25.4;

/**
 * @param {{ trimMm?: number, bleedMm?: number, safeInsetMm?: number }} [opts]
 */
export function stickerPrintMetrics(opts = {}) {
  const trimMm = opts.trimMm ?? STICKER_TRIM_MM;
  const bleedMm = opts.bleedMm ?? STICKER_BLEED_MM;
  const safeInsetMm = opts.safeInsetMm ?? STICKER_SAFE_INSET_MM;
  const canvasMm = trimMm + 2 * bleedMm;
  const safeSizeMm = trimMm - 2 * safeInsetMm;
  return {
    trimMm,
    bleedMm,
    safeInsetMm,
    canvasMm,
    safeSizeMm,
    safeX: bleedMm + safeInsetMm,
    safeY: bleedMm + safeInsetMm,
    trimX: bleedMm,
    trimY: bleedMm,
  };
}

/**
 * @param {number} inches
 */
export function stickerTrimMmFromInches(inches) {
  return Math.round(inches * MM_PER_IN * 100) / 100;
}

/**
 * Crop marks at trim corners (hairline, outside safe zone).
 * @param {ReturnType<typeof stickerPrintMetrics>} m
 */
function cropMarksSvg(m) {
  const { trimX, trimY, trimMm, bleedMm } = m;
  const len = Math.min(bleedMm * 0.85, 1.2);
  const stroke = 0.12;
  const c = "#b8b8b8";
  const x0 = trimX;
  const y0 = trimY;
  const x1 = trimX + trimMm;
  const y1 = trimY + trimMm;
  const lines = [
    [x0, y0 + len, x0, y0, x0 + len, y0],
    [x1 - len, y0, x1, y0, x1, y0 + len],
    [x0, y1 - len, x0, y1, x0 + len, y1],
    [x1 - len, y1, x1, y1, x1, y1 - len],
  ];
  const segs = lines
    .map(
      ([x1s, y1s, x2s, y2s, x3s, y3s]) =>
        `<path d="M ${x1s} ${y1s} L ${x2s} ${y2s} M ${x2s} ${y2s} L ${x3s} ${y3s}" fill="none" stroke="${c}" stroke-width="${stroke}"/>`
    )
    .join("");
  return `<g class="hc-print-crop-marks" aria-hidden="true">${segs}</g>`;
}

/**
 * @param {string} text
 */
function escapeSvgText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build print-ready SVG (mm units) from a framed Humanity QR SVG.
 * @param {string} framedQrSvg output of renderHumanityQrFrameSvg
 * @param {{ trimMm?: number, bleedMm?: number, safeInsetMm?: number, showGuides?: boolean, credentialCode?: string | null, qaWatermark?: boolean }} [opts]
 */
export function renderPrintStickerSvg(framedQrSvg, opts = {}) {
  const viewBoxMatch = framedQrSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const framedW = viewBoxMatch
    ? Number(viewBoxMatch[1])
    : extractQrSvgViewBoxSize(framedQrSvg);
  const framedH = viewBoxMatch ? Number(viewBoxMatch[2]) : framedW;
  if (!framedW || !framedQrSvg?.includes("</svg>")) {
    throw new Error("Invalid framed QR SVG for print sticker");
  }

  const m = stickerPrintMetrics(opts);
  const scale = Math.min(m.safeSizeMm / framedW, m.safeSizeMm / framedH);
  const placedW = framedW * scale;
  const placedH = framedH * scale;
  const offsetX = m.safeX + (m.safeSizeMm - placedW) / 2;
  const offsetY = m.safeY + (m.safeSizeMm - placedH) / 2;
  const inner = extractSvgInner(framedQrSvg);
  const showGuides = opts.showGuides !== false;

  const trimGuide = showGuides
    ? `<rect class="hc-print-trim-guide" x="${m.trimX}" y="${m.trimY}" width="${m.trimMm}" height="${m.trimMm}" fill="none" stroke="#e8e8e8" stroke-width="0.15" stroke-dasharray="0.6 0.4"/>`
    : "";
  const safeGuide = showGuides
    ? `<rect class="hc-print-safe-guide" x="${m.safeX}" y="${m.safeY}" width="${m.safeSizeMm}" height="${m.safeSizeMm}" fill="none" stroke="#f0f0f0" stroke-width="0.1"/>`
    : "";
  const marks = showGuides ? cropMarksSvg(m) : "";
  const code = opts.credentialCode?.trim();
  const codeLabel =
    code && CREDENTIAL_CODE_PATTERN.test(code)
      ? `<text class="hc-print-credential-code" x="${m.canvasMm / 2}" y="${m.canvasMm - m.bleedMm - 0.65}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="1.35" fill="#8a8a8a">${escapeSvgText(code)}</text>`
      : "";

  let svg = `<svg class="hc-print-sticker-svg" xmlns="http://www.w3.org/2000/svg" width="${m.canvasMm}mm" height="${m.canvasMm}mm" viewBox="0 0 ${m.canvasMm} ${m.canvasMm}" role="img" aria-label="Humanity print sticker"><rect width="${m.canvasMm}" height="${m.canvasMm}" fill="#ffffff"/>${trimGuide}${safeGuide}${marks}<g class="hc-print-sticker-qr" transform="translate(${offsetX} ${offsetY}) scale(${scale})">${inner}</g>${codeLabel}</svg>`;
  if (opts.qaWatermark) {
    svg = applyPrintQaWatermark(svg);
  }
  return svg;
}

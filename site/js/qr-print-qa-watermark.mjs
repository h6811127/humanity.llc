/**
 * Fulfillment print-proof watermark (docs/SCANNER_EXPERIENCE.md — post Phase F).
 * Marks artwork as internal QA / proof — not for customer-facing DIY print.
 */

export const PRINT_QA_WATERMARK_HEADLINE = "HUMANITY PRINT PROOF";

export const PRINT_QA_WATERMARK_SUBLINE = "DO NOT SHIP";

/**
 * Diagonal proof band for print sheets (mm coordinates).
 * @param {number} canvasMm full print canvas including bleed
 * @param {{ headline?: string; subline?: string; opacity?: number }} [opts]
 */
export function printQaWatermarkSvg(canvasMm, opts = {}) {
  const headline = opts.headline ?? PRINT_QA_WATERMARK_HEADLINE;
  const subline = opts.subline ?? PRINT_QA_WATERMARK_SUBLINE;
  const opacity = opts.opacity ?? 0.13;
  const cx = canvasMm / 2;
  const cy = canvasMm / 2;

  return `<g class="hc-print-qa-watermark" opacity="${opacity}" aria-hidden="true">
  <text x="${cx}" y="${cy - 1.2}" transform="rotate(-32 ${cx} ${cy - 1.2})" text-anchor="middle" font-family="system-ui,sans-serif" font-size="3" font-weight="700" letter-spacing="0.18em" fill="#db1b43">${escapeSvg(headline)}</text>
  <text x="${cx}" y="${cy + 2.4}" transform="rotate(-32 ${cx} ${cy + 2.4})" text-anchor="middle" font-family="system-ui,sans-serif" font-size="2.2" font-weight="600" letter-spacing="0.22em" fill="#8a8a8a">${escapeSvg(subline)}</text>
</g>`;
}

/**
 * Insert QA watermark into a print sticker SVG string.
 * @param {string} printStickerSvg
 * @param {{ headline?: string; subline?: string; opacity?: number }} [opts]
 */
export function applyPrintQaWatermark(printStickerSvg, opts = {}) {
  if (!printStickerSvg?.includes("</svg>")) {
    throw new Error("Invalid print sticker SVG for QA watermark");
  }
  const viewBoxMatch = printStickerSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const canvasMm = viewBoxMatch ? Number(viewBoxMatch[1]) : 53.8;
  const layer = printQaWatermarkSvg(canvasMm, opts);
  return printStickerSvg.replace("</svg>", `${layer}</svg>`);
}

/**
 * @param {string} text
 */
function escapeSvg(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

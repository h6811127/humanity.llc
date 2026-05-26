import QRCode from "qrcode";
import {
  overlayCenterLogoOnSvg,
  QR_BRANDED_RENDER_OPTIONS,
  QR_BRAND_RED,
  renderHumanityQrFrameSvg,
} from "../../../site/js/qr-branding.mjs";
import { renderPrintStickerSvg as buildPrintStickerSheetSvg } from "../../../site/js/qr-print-sticker.mjs";
import { credentialCodeFromScanUrl } from "../../../site/js/qr-credential-code.mjs";
import { assertOfficialScanUrl } from "../../../site/js/qr-scan-url-lock.mjs";

/**
 * Branded QR with signed frame (SVG only).
 */
export async function renderFramedScanQrSvg(scanUrl: string): Promise<string> {
  assertOfficialScanUrl(scanUrl);
  let svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
  svg = overlayCenterLogoOnSvg(svg);
  return renderHumanityQrFrameSvg(svg, {
    credentialCode: credentialCodeFromScanUrl(scanUrl),
  });
}

/**
 * Encodes the card scan URL as a branded red-on-white QR with a vector center logo.
 * Uses inline SVG — works in Cloudflare Workers (no node-canvas).
 */
export async function renderScanQrMarkup(scanUrl: string): Promise<string> {
  const framed = await renderFramedScanQrSvg(scanUrl);
  const label = "QR code for this Humanity live object scan link";
  return `<div class="hc-qr-frame pass-qr-svg" role="img" aria-label="${label}">${framed}</div>`;
}

/**
 * Print-ready sticker SVG (50.8 mm trim + bleed) for fulfillment / download.
 */
export async function renderPrintStickerFromScanUrl(scanUrl: string): Promise<string> {
  const framed = await renderFramedScanQrSvg(scanUrl);
  const credentialCode = credentialCodeFromScanUrl(scanUrl);
  return buildPrintStickerSheetSvg(framed, {
    credentialCode: credentialCode ?? undefined,
  });
}

/** @deprecated Use renderScanQrMarkup — kept for tests that expect data URLs */
export async function scanQrDataUrl(scanUrl: string): Promise<string> {
  assertOfficialScanUrl(scanUrl);
  return QRCode.toDataURL(scanUrl, {
    width: 176,
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
}

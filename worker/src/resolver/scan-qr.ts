import QRCode from "qrcode";
import {
  overlayCenterLogoOnSvg,
  QR_BRANDED_RENDER_OPTIONS,
  QR_BRAND_RED,
  qrCenterLogoHref,
} from "../../../site/js/qr-branding.mjs";

/**
 * Encodes the card scan URL as a branded red-on-white QR with a semi-transparent center logo.
 * Uses inline SVG — works in Cloudflare Workers (no node-canvas).
 */
export async function renderScanQrMarkup(
  scanUrl: string,
  origin = "https://humanity.llc"
): Promise<string> {
  let svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
  svg = overlayCenterLogoOnSvg(svg, { logoHref: qrCenterLogoHref(origin) });
  return `<div class="pass-qr-svg" role="img" aria-label="QR code for this card scan link">${svg}</div>`;
}

/** @deprecated Use renderScanQrMarkup — kept for tests that expect data URLs */
export async function scanQrDataUrl(scanUrl: string): Promise<string> {
  return QRCode.toDataURL(scanUrl, {
    width: 176,
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
}

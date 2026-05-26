import QRCode from "qrcode";
import {
  overlayCenterLogoOnSvg,
  QR_BRANDED_RENDER_OPTIONS,
  QR_BRAND_RED,
  renderHumanityQrFrameMarkup,
} from "../../../site/js/qr-branding.mjs";

/**
 * Encodes the card scan URL as a branded red-on-white QR with a vector center logo.
 * Uses inline SVG — works in Cloudflare Workers (no node-canvas).
 */
export async function renderScanQrMarkup(scanUrl: string): Promise<string> {
  let svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
  svg = overlayCenterLogoOnSvg(svg);
  return renderHumanityQrFrameMarkup(svg, {
    ariaLabel: "QR code for this Humanity live object scan link",
  });
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

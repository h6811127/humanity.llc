import QRCode from "qrcode";

const BRAND_RED = "#db1b43";

/**
 * Encodes the card scan URL as a red-on-white QR (same payload as /created/).
 * Uses inline SVG — works in Cloudflare Workers (no node-canvas).
 */
export async function renderScanQrMarkup(scanUrl: string): Promise<string> {
  const svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: BRAND_RED, light: "#ffffff" },
  });
  return `<div class="pass-qr-svg" role="img" aria-label="QR code for this card scan link">${svg}</div>`;
}

/** @deprecated Use renderScanQrMarkup — kept for tests that expect data URLs */
export async function scanQrDataUrl(scanUrl: string): Promise<string> {
  return QRCode.toDataURL(scanUrl, {
    width: 176,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: BRAND_RED, light: "#ffffff" },
  });
}

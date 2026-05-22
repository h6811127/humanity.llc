import QRCode from "qrcode";

const BRAND_RED = "#db1b43";

/** Encodes the card scan URL as a red-on-white QR (matches /created/). */
export async function scanQrDataUrl(scanUrl: string): Promise<string> {
  return QRCode.toDataURL(scanUrl, {
    width: 176,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: BRAND_RED, light: "#ffffff" },
  });
}

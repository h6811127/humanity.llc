/**
 * Render scan URLs as QR images in the browser (same-origin bundle, no CDN).
 */
import QRCode from "./vendor/qrcode.mjs";

/**
 * @param {HTMLImageElement} img
 * @param {string} text
 */
export async function renderQrToImage(img, text) {
  if (!text?.trim()) {
    img.removeAttribute("src");
    img.alt = "QR code unavailable";
    return;
  }
  const dataUrl = await QRCode.toDataURL(text, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  img.src = dataUrl;
  img.alt = "QR code for your scan link";
}

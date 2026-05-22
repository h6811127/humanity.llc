/**
 * Render scan URLs as QR images in the browser (no third-party QR API).
 */
import QRCode from "https://esm.sh/qrcode@1.5.4";

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

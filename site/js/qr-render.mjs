/**
 * Render scan URLs as branded QR images in the browser (same-origin bundle, no CDN).
 */
import { renderHumanityQrFrameToCanvas } from "./qr-branding.mjs";

/**
 * @param {string} text
 * @param {number} width
 */
async function qrToBrandedCanvas(text, width) {
  return renderHumanityQrFrameToCanvas(text, width);
}

/**
 * @param {string} text
 * @param {number} [width]
 */
export async function qrToDataUrl(text, width = 200) {
  if (!text?.trim()) throw new Error("No scan URL");
  const { assertOfficialScanUrl } = await import("./qr-scan-url-lock.mjs");
  assertOfficialScanUrl(text);
  const canvas = await qrToBrandedCanvas(text, width);
  return canvas.toDataURL("image/png");
}

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
  img.src = await qrToDataUrl(text, 220);
  img.alt = "QR code for your scan link";
}

/**
 * @param {string} text
 * @param {string} filename
 */
export async function downloadQrPng(text, filename) {
  const dataUrl = await qrToDataUrl(text, 512);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "humanity-qr.png";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

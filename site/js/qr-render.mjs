/**
 * Render scan URLs as branded QR images in the browser (same-origin bundle, no CDN).
 * Preview and download both use {@link renderHumanityQrFrameToCanvas} (finder mark + frame).
 */
import { renderHumanityQrFrameToCanvas } from "./qr-branding.mjs";

/** `/created/` hero QR and inline previews (`renderQrToImage`). */
export const QR_PREVIEW_RENDER_WIDTH = 220;

/** Download PNG button (`downloadQrPng`). */
export const QR_DOWNLOAD_RENDER_WIDTH = 512;

/**
 * @param {string} text
 * @param {number} width module square size in px passed to branded frame renderer
 */
async function qrToBrandedCanvas(text, width) {
  return renderHumanityQrFrameToCanvas(text, width);
}

/**
 * @param {string} text
 * @param {number} [width]
 */
export async function qrToDataUrl(text, width = QR_PREVIEW_RENDER_WIDTH) {
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
  img.src = await qrToDataUrl(text, QR_PREVIEW_RENDER_WIDTH);
  img.alt = "QR code for your scan link";
}

/**
 * @param {string} text
 * @param {string} filename
 */
export async function downloadQrPng(text, filename) {
  const dataUrl = await qrToDataUrl(text, QR_DOWNLOAD_RENDER_WIDTH);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "humanity-qr.png";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

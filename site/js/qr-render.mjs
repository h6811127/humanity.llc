/**
 * Render scan URLs as branded QR images in the browser (same-origin bundle, no CDN).
 * Preview and download both use {@link renderHumanityQrFrameToCanvas} (finder mark + frame).
 */
import { renderHumanityQrFrameToCanvas } from "./qr-branding.mjs";
import { assertOfficialScanUrl } from "./qr-scan-url-lock.mjs";
import { isAllowedStewardHandoffEncodeUrl } from "./steward-dual-qr-core.mjs";

/** `/created/` hero QR and inline previews (`renderQrToImage`). */
export const QR_PREVIEW_RENDER_WIDTH = 220;

/** Download PNG button (`downloadQrPng`). */
export const QR_DOWNLOAD_RENDER_WIDTH = 512;

/**
 * @param {string} text
 */
function assertQrEncodeUrl(text) {
  if (!text?.trim()) throw new Error("No URL to encode");
  try {
    assertOfficialScanUrl(text);
    return;
  } catch {
    if (isAllowedStewardHandoffEncodeUrl(text)) return;
    throw new Error("URL is not an official scan or steward handoff link");
  }
}

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
  assertQrEncodeUrl(text);
  const canvas = await qrToBrandedCanvas(text, width);
  return canvas.toDataURL("image/png");
}

/**
 * @param {HTMLImageElement} img
 * @param {string} text
 * @param {{ alt?: string }} [opts]
 */
export async function renderBrandedQrToImage(img, text, opts = {}) {
  if (!text?.trim()) {
    img.removeAttribute("src");
    img.alt = opts.alt ?? "QR code unavailable";
    return;
  }
  img.src = await qrToDataUrl(text, QR_PREVIEW_RENDER_WIDTH);
  img.alt = opts.alt ?? "QR code";
}

/**
 * @param {HTMLImageElement} img
 * @param {string} text
 */
export async function renderQrToImage(img, text) {
  await renderBrandedQrToImage(img, text, { alt: "QR code for your scan link" });
}

/**
 * @param {string} text
 * @param {string} filename
 * @param {number} [width]
 */
export async function downloadBrandedQrPng(text, filename, width = QR_DOWNLOAD_RENDER_WIDTH) {
  assertQrEncodeUrl(text);
  const canvas = await qrToBrandedCanvas(text, width);
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "humanity-qr.png";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * @param {string} text
 * @param {string} filename
 */
export async function downloadQrPng(text, filename) {
  await downloadBrandedQrPng(text, filename, QR_DOWNLOAD_RENDER_WIDTH);
}

/**
 * Render scan URLs as branded QR images in the browser (same-origin bundle, no CDN).
 */
import QRCode from "./vendor/qrcode.mjs";
import {
  QR_BRANDED_RENDER_OPTIONS,
  QR_CENTER_LOGO_OPACITY,
  QR_CENTER_LOGO_PATH,
  QR_CENTER_LOGO_SIZE_RATIO,
} from "./qr-branding.mjs";

let logoLoadPromise = null;

function loadCenterLogo() {
  if (!logoLoadPromise) {
    logoLoadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load QR center logo"));
      img.src = QR_CENTER_LOGO_PATH;
    });
  }
  return logoLoadPromise;
}

/**
 * @param {string} text
 * @param {number} width
 */
async function qrToBrandedCanvas(text, width) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, { ...QR_BRANDED_RENDER_OPTIONS, width });
  const logo = await loadCenterLogo();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  const logoSize = Math.round(width * QR_CENTER_LOGO_SIZE_RATIO);
  const x = Math.round((width - logoSize) / 2);
  const y = Math.round((width - logoSize) / 2);
  ctx.globalAlpha = QR_CENTER_LOGO_OPACITY;
  ctx.drawImage(logo, x, y, logoSize, logoSize);
  ctx.globalAlpha = 1;
  return canvas;
}

/**
 * @param {string} text
 * @param {number} [width]
 */
export async function qrToDataUrl(text, width = 200) {
  if (!text?.trim()) throw new Error("No scan URL");
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

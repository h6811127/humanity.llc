import QRCode from "qrcode";
import {
  brandedQrRenderColors,
  overlayCenterLogoOnSvg,
  QR_BRAND_RED,
  QR_BRANDED_RENDER_OPTIONS,
  renderHumanityQrFrameSvg,
} from "../../../site/js/qr-branding.mjs";
import { renderPrintStickerSvg as buildPrintStickerSheetSvg } from "../../../site/js/qr-print-sticker.mjs";
import { credentialCodeFromScanUrl } from "../../../site/js/qr-credential-code.mjs";
import { assertOfficialScanUrl } from "../../../site/js/qr-scan-url-lock.mjs";
import { DEFAULT_PRINT_TEMPLATE_ID } from "../print/print-catalog";
import type { BuyerPrintFrameBackground } from "../print/print-frame-background";
import {
  qrFrameRenderOptionsForFulfillment,
  resolvePrintTemplateRenderProfile,
} from "../print/print-template-render";
import type { QrFrameRenderOptions } from "../print/print-template-render";

/**
 * Branded QR with signed frame (SVG only).
 * Digital surfaces omit frameOpts — full card + default padding (docs/QR_BRANDING.md).
 */
export async function renderFramedScanQrSvg(
  scanUrl: string,
  frameOpts?: QrFrameRenderOptions
): Promise<string> {
  assertOfficialScanUrl(scanUrl);
  let svg = await QRCode.toString(scanUrl, {
    type: "svg",
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: brandedQrRenderColors({
      transparentQuietZone: frameOpts?.transparentQrQuietZone === true,
    }),
  });
  svg = overlayCenterLogoOnSvg(svg, {
    skipFinderLogo: frameOpts?.skipFinderLogo === true,
  });
  return renderHumanityQrFrameSvg(svg, {
    credentialCode: credentialCodeFromScanUrl(scanUrl),
    frameBackground: frameOpts?.frameBackground,
    framePadding: frameOpts?.framePadding,
  });
}

/**
 * Encodes the card scan URL as a branded red-on-white QR with a vector center logo.
 * Uses inline SVG - works in Cloudflare Workers (no node-canvas).
 */
export async function renderScanQrMarkup(scanUrl: string): Promise<string> {
  const framed = await renderFramedScanQrSvg(scanUrl);
  const label = "QR code for this Humanity live object scan link";
  return `<div class="hc-qr-frame pass-qr-svg" role="img" aria-label="${label}">${framed}</div>`;
}

/**
 * Print-ready artwork for fulfillment — template selects frame profile and output shape.
 */
export async function renderPrintArtworkFromScanUrl(
  scanUrl: string,
  templateId: string,
  printFrameBackground?: BuyerPrintFrameBackground | null
): Promise<string> {
  const profile = resolvePrintTemplateRenderProfile(templateId);
  const framed = await renderFramedScanQrSvg(
    scanUrl,
    qrFrameRenderOptionsForFulfillment(profile, printFrameBackground)
  );
  const credentialCode = credentialCodeFromScanUrl(scanUrl);
  if (profile.output === "sticker_sheet") {
    return buildPrintStickerSheetSvg(framed, {
      credentialCode: credentialCode ?? undefined,
    });
  }
  return framed;
}

/**
 * Print-ready sticker SVG (50.8 mm trim + bleed) for fulfillment / download.
 */
export async function renderPrintStickerFromScanUrl(scanUrl: string): Promise<string> {
  return renderPrintArtworkFromScanUrl(scanUrl, DEFAULT_PRINT_TEMPLATE_ID);
}

/**
 * Fulfillment / operator proof sheet with QA watermark (do not ship to production).
 */
export async function renderPrintProofStickerFromScanUrl(
  scanUrl: string
): Promise<string> {
  const framed = await renderFramedScanQrSvg(scanUrl);
  const credentialCode = credentialCodeFromScanUrl(scanUrl);
  return buildPrintStickerSheetSvg(framed, {
    credentialCode: credentialCode ?? undefined,
    qaWatermark: true,
    showGuides: true,
  });
}

/** @deprecated Use renderScanQrMarkup - kept for tests that expect data URLs */
export async function scanQrDataUrl(scanUrl: string): Promise<string> {
  assertOfficialScanUrl(scanUrl);
  return QRCode.toDataURL(scanUrl, {
    width: 176,
    margin: 1,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
}

/** Owner proof deeplink for in-person live control handoff (H-06). */
export function isLiveControlOwnerUrl(ownerUrl: string): boolean {
  try {
    const url = new URL(ownerUrl);
    if (!url.pathname.startsWith("/created")) return false;
    if (url.protocol === "https:" && url.hostname.endsWith("humanity.llc")) return true;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    return false;
  } catch {
    return false;
  }
}

/** Compact branded SVG QR for owner proof deeplink (scan page owner pane). */
export async function renderLiveControlOwnerQrSvg(ownerUrl: string): Promise<string> {
  if (!isLiveControlOwnerUrl(ownerUrl)) {
    throw new Error("invalid_live_control_owner_url");
  }
  const svg = await QRCode.toString(ownerUrl, {
    type: "svg",
    margin: 1,
    width: 132,
    ...QR_BRANDED_RENDER_OPTIONS,
    color: { dark: QR_BRAND_RED, light: QR_BRANDED_RENDER_OPTIONS.color.light },
  });
  return `<div class="live-control-owner-qr" role="img" aria-label="QR code for owner to prove control">${svg}</div>`;
}

/**
 * Glitch hoodie Printify gallery + print-frame preview (customizer).
 * @see docs/QR_BRANDING.md § Two registers
 */

import {
  GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW,
  glitchHoodieMockupHasTransparentPreview,
} from "./shop-glitch-hoodie-mockups-core.mjs";

/** Tight frame matches fulfillment SVG for hc-glitch-hoodie-v1. */
export const GLITCH_PRINT_QR_OVERLAY_WIDTH = 112;

export const GLITCH_PRINT_FRAME_BACKGROUND_STORAGE_KEY = "hc_glitch_print_frame_background";

/** @typedef {"full" | "transparent"} GlitchPrintFrameBackgroundPreview */

/** Buyer-selectable print previews (launch fulfillment default: full). */
export const GLITCH_PRINT_FRAME_BACKGROUND_OPTIONS = [
  {
    id: "full",
    label: "White card",
    description: "White background behind the full printed QR object — best scan reliability on any color.",
  },
  {
    id: "transparent",
    label: "Transparent",
    description: "No white card — QR and type print directly on the fabric color.",
  },
];

export const DEFAULT_GLITCH_PRINT_FRAME_BACKGROUND = "full";

/** Transparent print preview not offered — scan reliability on these garment colors. */
export const GLITCH_PRINT_WHITE_CARD_ONLY_COLORS = ["Charcoal Heather", "Royal Blue"];

/**
 * @param {string} [color]
 * @returns {boolean}
 */
export function glitchPrintTransparentOfferedForColor(color) {
  const key = color?.trim() ?? "";
  if (!key) return true;
  // Exact color label match only (variant matrix uses "Navy", not "Royal Blue" substring rules).
  return !GLITCH_PRINT_WHITE_CARD_ONLY_COLORS.includes(key);
}

/**
 * @param {string} raw
 * @returns {GlitchPrintFrameBackgroundPreview}
 */
export function normalizeGlitchPrintFrameBackground(raw) {
  const key = raw?.trim() ?? "";
  if (key === "transparent") return "transparent";
  return "full";
}

/**
 * @param {GlitchPrintFrameBackgroundPreview} value
 */
export function persistGlitchPrintFrameBackground(value) {
  try {
    sessionStorage.setItem(
      GLITCH_PRINT_FRAME_BACKGROUND_STORAGE_KEY,
      normalizeGlitchPrintFrameBackground(value)
    );
  } catch {
    /* private mode */
  }
}

/**
 * @returns {GlitchPrintFrameBackgroundPreview}
 */
export function readStoredGlitchPrintFrameBackground() {
  try {
    return normalizeGlitchPrintFrameBackground(
      sessionStorage.getItem(GLITCH_PRINT_FRAME_BACKGROUND_STORAGE_KEY)
    );
  } catch {
    return DEFAULT_GLITCH_PRINT_FRAME_BACKGROUND;
  }
}

/**
 * Frame value for artifact-intent API (matches server color policy).
 * @param {string} [color]
 * @param {string} [frameBackground]
 * @returns {GlitchPrintFrameBackgroundPreview}
 */
export function glitchArtifactIntentPrintFrameBackground(color, frameBackground) {
  const frame = normalizeGlitchPrintFrameBackground(frameBackground);
  if (frame === "transparent" && !glitchPrintTransparentOfferedForColor(color)) {
    return "full";
  }
  return frame;
}

/**
 * Cache key for reusing artifact intents when variant + print frame are unchanged.
 * @param {{ print_variant_id?: string, shopify_variant_id?: string }} variant
 * @param {GlitchPrintFrameBackgroundPreview} printFrameBackground
 */
export function artifactIntentSelectionKey(variant, printFrameBackground) {
  const printVariantId = variant?.print_variant_id ?? "";
  const shopifyVariantId = variant?.shopify_variant_id ?? "";
  const frame = normalizeGlitchPrintFrameBackground(printFrameBackground);
  return `${printVariantId}|${shopifyVariantId}|${frame}`;
}

/**
 * @param {string} color
 * @returns {boolean}
 */
export function isWhiteGarmentColor(color) {
  return /^white$/i.test(color?.trim() ?? "");
}

/**
 * Scan reliability notice when previewing non-white garment without white card.
 * @param {{ color?: string, frameBackground?: string }} input
 * @returns {string | null}
 */
export function glitchPrintScanReliabilityWarning(input = {}) {
  const frameBackground = normalizeGlitchPrintFrameBackground(input.frameBackground);
  const color = input.color?.trim() ?? "";
  if (!color || isWhiteGarmentColor(color)) return null;
  if (frameBackground === "full") return null;
  if (!glitchPrintTransparentOfferedForColor(color)) {
    return (
      `${color} needs a white card background for reliable scanning. ` +
      "Transparent print is not offered for this color."
    );
  }
  return (
    "If you order a non-white hoodie with a live QR printed without a white card background, " +
    "we cannot guarantee phone-camera scannability on the garment. " +
    "Choose White card for the most reliable scan experience."
  );
}

/**
 * Show buyer's planned QR on back mock only (art placement matches Printify back).
 * @param {string} viewId
 * @returns {boolean}
 */
export function glitchPrintQrOverlayVisible(viewId) {
  const key = viewId?.trim() ?? "";
  return key === "back" || key === GLITCH_HOODIE_DEFAULT_MOCKUP_VIEW;
}

/** Approximate garment ink for transparent-back overlay-only preview (not Printify JPEG). */
export const GLITCH_HOODIE_GARMENT_SWATCH_HEX = {
  Black: "#1a1a1c",
  "Charcoal Heather": "#4a4f54",
  "Light Steel": "#b8bcc4",
  Navy: "#1e2a44",
  "Royal Blue": "#2956a8",
  "Stone Grey": "#8b8680",
  White: "#f4f4f2",
};

/**
 * @param {string} [color]
 * @returns {string}
 */
export function glitchHoodieGarmentSwatchHex(color) {
  const key = color?.trim() ?? "";
  return GLITCH_HOODIE_GARMENT_SWATCH_HEX[key] ?? "#3a3a3c";
}

/**
 * Transparent + back: hide Printify sample mock; show only the live transparent QR object
 * on the selected garment color (not a blank photo — the PNG overlay is the preview).
 * @param {{ frameBackground?: string, viewId?: string, mockupEntry?: { src_transparent?: string } | null }} [input]
 * @returns {boolean}
 */
export function glitchPrintPreviewUsesGarmentSwatchOnly(input = {}) {
  if (normalizeGlitchPrintFrameBackground(input.frameBackground) !== "transparent") {
    return false;
  }
  if (!glitchPrintQrOverlayVisible(input.viewId ?? "")) return false;
  return !glitchHoodieMockupHasTransparentPreview(input.mockupEntry);
}

/**
 * @param {{ frameBackground?: string, viewId?: string, mockupEntry?: { src_transparent?: string } | null }} [input]
 * @returns {string}
 */
export function glitchPrintFramePreviewHint(input = {}) {
  const frameBackground = normalizeGlitchPrintFrameBackground(input.frameBackground);
  const onBack = glitchPrintQrOverlayVisible(input.viewId ?? "");
  const hasTransparentMock = glitchHoodieMockupHasTransparentPreview(input.mockupEntry);
  if (frameBackground === "transparent" && !onBack) {
    return (
      "Transparent garment mockups update on the Back view — use the view buttons above. " +
      "Your planned QR below matches what we print after checkout."
    );
  }
  if (frameBackground === "transparent" && hasTransparentMock) {
    return (
      "Transparent: Printify mockup for this color (fabric shows through the QR). " +
      "Your planned QR below matches what we print after checkout."
    );
  }
  if (frameBackground === "transparent") {
    return (
      "Transparent: no Printify mock for this color yet — garment area shows a color swatch on Back. " +
      "Your planned QR below matches what we print after checkout."
    );
  }
  return (
    "White card: Printify mockup above; your planned QR below uses the white card. " +
    "That is what we print after checkout."
  );
}

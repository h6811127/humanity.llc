/**
 * Per-template print artwork render profiles (Artifact Renderer).
 * Digital scan/created QR stays on default frame — see docs/QR_BRANDING.md § Registers.
 */

import {
  DEFAULT_PRINT_TEMPLATE_ID,
  FOUNDING_PURSE_TEMPLATE_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
} from "./print-catalog";
import type { BuyerPrintFrameBackground } from "./print-frame-background";
import type { PrintifyArtworkConfig } from "./printify-artwork-config";

/** White card behind full frame, QR island only, or no card fill (modules stay on white quiet zone). */
export type QrFrameBackground = "full" | "qr_only" | "transparent";

export type QrFramePadding = "default" | "tight";

/** Sticker adds mm trim sheet; hoodies upload framed SVG to Printify placeholder. */
export type PrintArtworkOutput = "sticker_sheet" | "frame_svg";

/**
 * How middleware art relates to the Printify product template.
 * - standalone: uploaded SVG is the full print-area art
 * - printify_layer: static Glitch frame in Printify; future QR-only layer uploads
 */
export type PrintComposition = "standalone" | "printify_layer";

/** Printify blueprint placeholder id (Champion S700 back print vs front chest). */
export type PrintifyPlaceholder = "front" | "back";

export interface PrintTemplateRenderProfile {
  frameBackground: QrFrameBackground;
  framePadding: QrFramePadding;
  output: PrintArtworkOutput;
  composition: PrintComposition;
  /** Overrides env placeholder when creating ephemeral fulfillment products. */
  printifyPlaceholder?: PrintifyPlaceholder;
}

export interface QrFrameRenderOptions {
  frameBackground?: QrFrameBackground;
  framePadding?: QrFramePadding;
  /**
   * Print/mock only: QR quiet zone is transparent (garment shows through the code background).
   * Not for production fulfillment default — scan reliability on fabric drops sharply.
   */
  transparentQrQuietZone?: boolean;
  /** Omit module-masked rose/ink finder mark — leaves standard brand-red finder (scan test). */
  skipFinderLogo?: boolean;
}

const DEFAULT_PROFILE: PrintTemplateRenderProfile = {
  frameBackground: "full",
  framePadding: "default",
  output: "sticker_sheet",
  composition: "standalone",
};

const PROFILES: Record<string, PrintTemplateRenderProfile> = {
  [DEFAULT_PRINT_TEMPLATE_ID]: DEFAULT_PROFILE,
  [HOODIE_LIVE_OBJECT_TEMPLATE_ID]: {
    frameBackground: "full",
    framePadding: "tight",
    output: "frame_svg",
    composition: "standalone",
    printifyPlaceholder: "front",
  },
  [GLITCH_HOODIE_TEMPLATE_ID]: {
    frameBackground: "full",
    framePadding: "tight",
    output: "frame_svg",
    composition: "standalone",
    printifyPlaceholder: "back",
  },
  [FOUNDING_PURSE_TEMPLATE_ID]: {
    frameBackground: "full",
    framePadding: "tight",
    output: "frame_svg",
    composition: "standalone",
    printifyPlaceholder: "front",
  },
};

export function resolvePrintTemplateRenderProfile(
  templateId: string
): PrintTemplateRenderProfile {
  return PROFILES[templateId] ?? DEFAULT_PROFILE;
}

export function qrFrameRenderOptionsFromProfile(
  profile: PrintTemplateRenderProfile
): QrFrameRenderOptions {
  return {
    frameBackground: profile.frameBackground,
    framePadding: profile.framePadding,
  };
}

/**
 * Merge template profile with buyer-persisted frame choice (artifact intent / print order).
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Glitch print frame background
 */
export function qrFrameRenderOptionsForFulfillment(
  profile: PrintTemplateRenderProfile,
  printFrameBackground?: BuyerPrintFrameBackground | null
): QrFrameRenderOptions {
  if (printFrameBackground === "transparent") {
    return {
      frameBackground: "transparent",
      framePadding: profile.framePadding,
      transparentQrQuietZone: true,
      skipFinderLogo: true,
    };
  }
  return qrFrameRenderOptionsFromProfile(profile);
}

/** Apply approved-template placeholder (e.g. Glitch → back) on top of env defaults. */
export function applyPrintTemplateToArtworkConfig(
  config: PrintifyArtworkConfig,
  templateId: string
): PrintifyArtworkConfig {
  const profile = resolvePrintTemplateRenderProfile(templateId);
  if (!profile.printifyPlaceholder) return config;
  return { ...config, placeholder_position: profile.printifyPlaceholder };
}

import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

import {
  extractQrSvgViewBoxSize,
  overlayCenterLogoOnSvg,
  QR_BRAND_RED,
  renderHumanityQrFrameSvg,
} from "../../site/js/qr-branding.mjs";
import {
  DEFAULT_PRINT_TEMPLATE_ID,
  GLITCH_HOODIE_TEMPLATE_ID,
  HOODIE_LIVE_OBJECT_TEMPLATE_ID,
} from "../src/print/print-catalog";
import {
  applyPrintTemplateToArtworkConfig,
  qrFrameRenderOptionsForFulfillment,
  resolvePrintTemplateRenderProfile,
} from "../src/print/print-template-render";
import {
  renderFramedScanQrSvg,
  renderPrintArtworkFromScanUrl,
} from "../src/resolver/scan-qr";

const SCAN_URL =
  "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8";

describe("resolvePrintTemplateRenderProfile", () => {
  it("uses default padding for stickers", () => {
    const profile = resolvePrintTemplateRenderProfile(DEFAULT_PRINT_TEMPLATE_ID);
    expect(profile.framePadding).toBe("default");
    expect(profile.output).toBe("sticker_sheet");
  });

  it("uses tight full frame for hoodie templates", () => {
    for (const id of [HOODIE_LIVE_OBJECT_TEMPLATE_ID, GLITCH_HOODIE_TEMPLATE_ID]) {
      const profile = resolvePrintTemplateRenderProfile(id);
      expect(profile.frameBackground).toBe("full");
      expect(profile.framePadding).toBe("tight");
      expect(profile.output).toBe("frame_svg");
    }
  });

  it("maps Glitch to back placeholder and Live Object to front", () => {
    expect(resolvePrintTemplateRenderProfile(GLITCH_HOODIE_TEMPLATE_ID).printifyPlaceholder).toBe(
      "back"
    );
    expect(
      resolvePrintTemplateRenderProfile(HOODIE_LIVE_OBJECT_TEMPLATE_ID).printifyPlaceholder
    ).toBe("front");
  });
});

describe("applyPrintTemplateToArtworkConfig", () => {
  it("overrides placeholder_position from template profile", () => {
    const base = {
      blueprint_id: 528,
      print_provider_id: 99,
      variant_id: 68861,
      placeholder_position: "front",
      image_x: 0.5,
      image_y: 0.5,
      image_scale: 0.35,
      image_angle: 0,
    };
    const glitch = applyPrintTemplateToArtworkConfig(base, GLITCH_HOODIE_TEMPLATE_ID);
    expect(glitch.placeholder_position).toBe("back");
    const hoodie = applyPrintTemplateToArtworkConfig(base, HOODIE_LIVE_OBJECT_TEMPLATE_ID);
    expect(hoodie.placeholder_position).toBe("front");
  });
});

describe("renderHumanityQrFrameSvg framePadding", () => {
  it("tight padding yields smaller viewBox than default", async () => {
    let svg = await QRCode.toString(SCAN_URL, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "Q",
      color: { dark: QR_BRAND_RED, light: "#ffffff" },
    });
    svg = overlayCenterLogoOnSvg(svg);
    const qrSize = extractQrSvgViewBoxSize(svg);
    const defaultFramed = renderHumanityQrFrameSvg(svg, {
      framePadding: "default",
      frameBackground: "full",
    });
    const tightFramed = renderHumanityQrFrameSvg(svg, {
      framePadding: "tight",
      frameBackground: "full",
    });
    const defaultMatch = defaultFramed.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const tightMatch = tightFramed.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const defaultW = Number(defaultMatch?.[1]);
    const defaultH = Number(defaultMatch?.[2]);
    const tightW = Number(tightMatch?.[1]);
    const tightH = Number(tightMatch?.[2]);
    expect(tightW).toBeLessThan(defaultW);
    expect(tightH).toBeLessThan(defaultH);
    expect(qrSize).toBeGreaterThan(0);
  });
});

describe("qrFrameRenderOptionsForFulfillment", () => {
  it("maps buyer transparent to garment-through render opts", () => {
    const profile = resolvePrintTemplateRenderProfile(GLITCH_HOODIE_TEMPLATE_ID);
    expect(qrFrameRenderOptionsForFulfillment(profile, "transparent")).toEqual({
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: true,
      skipFinderLogo: true,
    });
    expect(qrFrameRenderOptionsForFulfillment(profile, "full")).toEqual({
      frameBackground: "full",
      framePadding: "tight",
    });
  });
});

describe("renderPrintArtworkFromScanUrl", () => {
  it("hoodie output is framed SVG without sticker trim sheet", async () => {
    const svg = await renderPrintArtworkFromScanUrl(SCAN_URL, GLITCH_HOODIE_TEMPLATE_ID);
    expect(svg).toContain('class="hc-qr-frame-svg"');
    expect(svg).not.toContain("STICKER_TRIM");
    expect(svg).not.toMatch(/50\.8\s*mm/);
  });

  it("sticker output includes trim sheet wrapper", async () => {
    const svg = await renderPrintArtworkFromScanUrl(SCAN_URL, DEFAULT_PRINT_TEMPLATE_ID);
    expect(svg).toContain("hc-print-sticker-svg");
  });

  it("uses print_frame_background transparent for Glitch fulfillment upload SVG", async () => {
    const full = await renderPrintArtworkFromScanUrl(
      SCAN_URL,
      GLITCH_HOODIE_TEMPLATE_ID,
      "full"
    );
    const transparent = await renderPrintArtworkFromScanUrl(
      SCAN_URL,
      GLITCH_HOODIE_TEMPLATE_ID,
      "transparent"
    );
    expect(full).toMatch(
      /<rect width="[\d.]+" height="[\d.]+" rx="[\d.]+" fill="#ffffff"\/>/
    );
    expect(transparent).not.toMatch(
      /<rect width="[\d.]+" height="[\d.]+" rx="[\d.]+" fill="#ffffff"\/>/
    );
    const extractQrInner = (framed: string) => {
      const gMatch = framed.match(/<g transform="translate\([^)]+\)">([\s\S]*?)<\/g>\s*<text/);
      return gMatch?.[1] ?? "";
    };
    expect(extractQrInner(transparent)).not.toMatch(/fill="#ffffff"|fill="#fff"/i);
  });

  it("transparentQrQuietZone omits white fills in QR module SVG", async () => {
    const withWhite = await renderFramedScanQrSvg(SCAN_URL, {
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: false,
    });
    const garmentThrough = await renderFramedScanQrSvg(SCAN_URL, {
      frameBackground: "transparent",
      framePadding: "tight",
      transparentQrQuietZone: true,
    });
    const extractQrInner = (framed) => {
      const gMatch = framed.match(/<g transform="translate\([^)]+\)">([\s\S]*?)<\/g>\s*<text/);
      return gMatch?.[1] ?? "";
    };
    expect(garmentThrough).not.toMatch(/<rect[^>]*fill="#ffffff"/i);
    const innerGarment = extractQrInner(garmentThrough);
    expect(innerGarment).toMatch(/stroke="#db1b43"/);
    expect(innerGarment).not.toMatch(/fill="#ffffff"|fill="#fff"/i);
    const innerWhite = extractQrInner(withWhite);
    expect(innerWhite.length).toBeGreaterThan(0);
  });

  it("digital renderFramedScanQrSvg omits tight padding", async () => {
    const digital = await renderFramedScanQrSvg(SCAN_URL);
    const tightPrint = await renderFramedScanQrSvg(SCAN_URL, {
      framePadding: "tight",
      frameBackground: "full",
    });
    const digitalMatch = digital.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const tightMatch = tightPrint.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    expect(Number(tightMatch?.[2])).toBeLessThan(Number(digitalMatch?.[2]));
  });
});

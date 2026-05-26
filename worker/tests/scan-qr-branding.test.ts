import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

import {
  brandMarkGlyphSvgFragment,
  centerLogoSvgFragment,
  overlayCenterLogoOnSvg,
  QR_BRANDED_ERROR_CORRECTION,
  QR_BRAND_RED,
  QR_CENTER_LOGO_INNER_FILL,
  QR_CENTER_LOGO_INNER_OPACITY,
  QR_CENTER_LOGO_OPACITY,
  QR_CENTER_LOGO_OUTER_FILL,
  QR_CENTER_LOGO_OUTER_OPACITY,
  QR_CENTER_LOGO_SIZE_RATIO,
  QR_FRAME_BRAND_MARK_OPACITY,
  QR_FRAME_FOOTER_TEXT,
  QR_FRAME_LIVE_OBJECT_TEXT,
  renderHumanityQrFrameSvg,
} from "../../site/js/qr-branding.mjs";
import { credentialCodeFromScanUrl } from "../../site/js/qr-credential-code.mjs";
import { renderScanQrMarkup } from "../src/resolver/scan-qr";

describe("centerLogoSvgFragment", () => {
  it("draws concentric circles without a raster image plate", () => {
    const frag = centerLogoSvgFragment(37);
    expect(frag).toContain("<circle");
    expect(frag).toContain(QR_CENTER_LOGO_OUTER_FILL);
    expect(frag).toContain(QR_CENTER_LOGO_INNER_FILL);
    expect(frag).not.toContain("<image");
    expect(frag).toContain(`opacity="${QR_CENTER_LOGO_OUTER_OPACITY}"`);
    expect(frag).toContain(`opacity="${QR_CENTER_LOGO_INNER_OPACITY}"`);
    expect(frag).toContain('class="hc-qr-center-logo-outer"');
  });
});

describe("brandMarkGlyphSvgFragment", () => {
  it("draws a transparent brand-red finder fingerprint (no salmon/ink circles)", () => {
    const frag = brandMarkGlyphSvgFragment(14, 6, 6);
    expect(frag).toContain('class="hc-qr-brand-mark"');
    expect(frag).toContain(`opacity="${QR_FRAME_BRAND_MARK_OPACITY}"`);
    expect(frag).toContain(`fill="${QR_BRAND_RED}"`);
    expect(frag).toContain("<rect");
    expect(frag).not.toContain("<circle");
    expect(frag).not.toContain(QR_CENTER_LOGO_OUTER_FILL);
    expect(frag).not.toContain(QR_CENTER_LOGO_INNER_FILL);
  });
});

describe("overlayCenterLogoOnSvg", () => {
  it("inserts vector logo with configured size", async () => {
    const svg = await QRCode.toString("https://humanity.llc/c/test?q=qr_1", {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "Q",
      color: { dark: QR_BRAND_RED, light: "#ffffff" },
    });
    const out = overlayCenterLogoOnSvg(svg);
    expect(out).toContain('class="hc-qr-center-logo"');
    expect(out).not.toContain("<image");
    // Mask ensures the center logo only renders over dark QR modules.
    expect(out).toMatch(/hc-qr-center-logo-mask-/);
    expect(out).toMatch(/mask="url\(#hc-qr-center-logo-mask-/);
    const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?)/);
    const size = viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
    const logoSize = size * QR_CENTER_LOGO_SIZE_RATIO;
    const offset = (size - logoSize) / 2;
    expect(out).toContain(`r="${logoSize / 2}"`);
    expect(out).toContain(`cx="${offset + logoSize / 2}"`);
  });
});

describe("renderHumanityQrFrameSvg", () => {
  it("adds border, brand mark, LIVE OBJECT, and humanity.llc footer", async () => {
    const scanUrl = "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8";
    let svg = await QRCode.toString(scanUrl, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "Q",
    });
    svg = overlayCenterLogoOnSvg(svg);
    const framed = renderHumanityQrFrameSvg(svg, {
      credentialCode: credentialCodeFromScanUrl(scanUrl),
    });
    expect(framed).toContain('class="hc-qr-frame-svg"');
    expect(framed).toContain('class="hc-qr-brand-mark"');
    expect(framed).not.toContain('class="hc-qr-network-glyph"');
    expect(framed).toContain(QR_FRAME_LIVE_OBJECT_TEXT);
    expect(framed).toContain(QR_FRAME_FOOTER_TEXT);
    expect(framed).toContain(`stroke="${QR_BRAND_RED}"`);
    expect(framed).toContain('class="hc-qr-frame-code-text"');
    expect(framed).toContain("HC-");
  });
});

describe("renderScanQrMarkup", () => {
  it("rejects URLs that fail host lock", async () => {
    await expect(renderScanQrMarkup("https://humanity.llc/")).rejects.toThrow(
      /Official scan URL required/
    );
  });

  it("returns branded framed SVG with vector center logo", async () => {
    const html = await renderScanQrMarkup(
      "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8"
    );
    expect(html).toContain('class="hc-qr-frame pass-qr-svg"');
    expect(html).toContain('class="hc-qr-frame-svg"');
    expect(html).toContain('class="hc-qr-center-logo"');
    expect(html).toContain(QR_FRAME_LIVE_OBJECT_TEXT);
    expect(html).not.toContain("<image");
    expect(html).toContain(QR_BRAND_RED);
  });

  it("uses error correction Q in generated QR", async () => {
    const scanUrl = "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8";
    const html = await renderScanQrMarkup(scanUrl);
    const plain = await QRCode.toString(scanUrl, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: QR_BRANDED_ERROR_CORRECTION,
    });
    expect(html.includes("</svg>")).toBe(true);
    expect(plain.includes("</svg>")).toBe(true);
    expect(html.length).toBeGreaterThan(plain.length);
  });
});

describe("drawCenterLogoOnCanvas", () => {
  it("exports canvas helper for browser renderer", async () => {
    const { drawCenterLogoOnCanvas } = await import("../../site/js/qr-branding.mjs");
    expect(typeof drawCenterLogoOnCanvas).toBe("function");
  });
});

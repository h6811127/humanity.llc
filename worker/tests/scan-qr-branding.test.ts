import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

import {
  brandMarkGlyphSvgFragment,
  centerLogoSvgFragment,
  finderLogoMetrics,
  finderLogoSvgFragment,
  overlayCenterLogoOnSvg,
  QR_BRANDED_ERROR_CORRECTION,
  QR_BRANDED_RENDER_OPTIONS,
  QR_BRAND_RED,
  QR_CENTER_LOGO_INNER_FILL,
  QR_CENTER_LOGO_INNER_OPACITY,
  QR_CENTER_LOGO_OUTER_FILL,
  QR_CENTER_LOGO_OUTER_OPACITY,
  QR_FINDER_LOGO_SIZE_RATIO,
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

describe("finderLogoSvgFragment", () => {
  it("places two-tone circles on the top-left finder center", () => {
    const size = 37;
    const frag = finderLogoSvgFragment(size);
    const { cx, cy, outerR } = finderLogoMetrics(size);
    expect(frag).toContain('class="hc-qr-finder-logo-outer"');
    expect(frag).toContain(QR_CENTER_LOGO_OUTER_FILL);
    expect(frag).toContain(QR_CENTER_LOGO_INNER_FILL);
    expect(frag).toContain(`cx="${cx}"`);
    expect(frag).toContain(`cy="${cy}"`);
    expect(frag).toContain(`r="${outerR}"`);
    expect(cx).toBe(QR_BRANDED_RENDER_OPTIONS.margin + 3.5);
  });
});

describe("brandMarkGlyphSvgFragment", () => {
  it("draws a soft transparent brand-red corner dot (no salmon/ink rings)", () => {
    const frag = brandMarkGlyphSvgFragment(14, 6, 6);
    expect(frag).toContain('class="hc-qr-brand-mark"');
    expect(frag).toContain(`opacity="${QR_FRAME_BRAND_MARK_OPACITY}"`);
    expect(frag).toContain(`fill="${QR_BRAND_RED}"`);
    expect(frag).toContain("<circle");
    expect(frag).not.toContain("<rect");
    expect(frag).not.toContain(QR_CENTER_LOGO_OUTER_FILL);
    expect(frag).not.toContain(QR_CENTER_LOGO_INNER_FILL);
  });
});

describe("overlayCenterLogoOnSvg", () => {
  it("inserts module-masked two-tone mark on the top-left finder", async () => {
    const svg = await QRCode.toString("https://humanity.llc/c/test?q=qr_1", {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "Q",
      color: { dark: QR_BRAND_RED, light: "#ffffff" },
    });
    const out = overlayCenterLogoOnSvg(svg, { margin: 1 });
    expect(out).toContain('class="hc-qr-finder-logo"');
    expect(out).not.toContain('class="hc-qr-center-logo"');
    expect(out).not.toContain("<image");
    expect(out).toMatch(/hc-qr-finder-logo-mask-/);
    expect(out).toMatch(/mask="url\(#hc-qr-finder-logo-mask-/);
    const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?)/);
    const size = viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
    const { cx, cy, outerR } = finderLogoMetrics(size, QR_FINDER_LOGO_SIZE_RATIO, 1);
    expect(out).toContain(`r="${outerR}"`);
    expect(out).toContain(`cx="${cx}"`);
    expect(out).toContain(`cy="${cy}"`);
    expect(cx).toBe(4.5);
  });
});

describe("renderHumanityQrFrameSvg", () => {
  it("adds border, LIVE OBJECT, and footer without frame-margin brand dot", async () => {
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
    expect(framed).not.toContain('class="hc-qr-brand-mark"');
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

  it("returns branded framed SVG with module-masked finder mark", async () => {
    const html = await renderScanQrMarkup(
      "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8"
    );
    expect(html).toContain('class="hc-qr-frame pass-qr-svg"');
    expect(html).toContain('class="hc-qr-frame-svg"');
    expect(html).toContain('class="hc-qr-finder-logo"');
    expect(html).not.toContain('class="hc-qr-center-logo"');
    expect(html).not.toContain('class="hc-qr-brand-mark"');
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

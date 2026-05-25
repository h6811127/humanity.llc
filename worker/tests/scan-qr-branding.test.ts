import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

import {
  overlayCenterLogoOnSvg,
  QR_BRANDED_ERROR_CORRECTION,
  QR_CENTER_LOGO_OPACITY,
  QR_CENTER_LOGO_SIZE_RATIO,
} from "../../site/js/qr-branding.mjs";
import { renderScanQrMarkup } from "../src/resolver/scan-qr";

describe("overlayCenterLogoOnSvg", () => {
  it("inserts a centered image with configured opacity and size", async () => {
    const svg = await QRCode.toString("https://humanity.llc/c/test?q=qr_1", {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "Q",
    });
    const out = overlayCenterLogoOnSvg(svg, {
      logoHref: "https://humanity.llc/assets/qr-center-logo.png",
    });
    expect(out).toContain('href="https://humanity.llc/assets/qr-center-logo.png"');
    expect(out).toContain(`opacity="${QR_CENTER_LOGO_OPACITY}"`);
    const viewBoxMatch = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?)/);
    const size = viewBoxMatch ? Number(viewBoxMatch[1]) : 0;
    const logoSize = size * QR_CENTER_LOGO_SIZE_RATIO;
    const offset = (size - logoSize) / 2;
    expect(out).toContain(`width="${logoSize}"`);
    expect(out).toContain(`x="${offset}"`);
  });
});

describe("renderScanQrMarkup", () => {
  it("returns branded SVG wrapper with center logo", async () => {
    const html = await renderScanQrMarkup(
      "https://humanity.llc/c/abc?q=qr_xyz",
      "https://humanity.llc"
    );
    expect(html).toContain('class="pass-qr-svg"');
    expect(html).toContain("/assets/qr-center-logo.png");
    expect(html).toContain(`opacity="${QR_CENTER_LOGO_OPACITY}"`);
    expect(html).toContain("#db1b43");
  });

  it("uses error correction Q in generated QR", async () => {
    const scanUrl = "https://humanity.llc/c/abc?q=qr_xyz";
    const html = await renderScanQrMarkup(scanUrl, "https://humanity.llc");
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

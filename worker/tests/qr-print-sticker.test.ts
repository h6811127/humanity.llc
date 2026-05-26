import { describe, expect, it } from "vitest";

import {
  STICKER_BLEED_MM,
  STICKER_SAFE_INSET_MM,
  STICKER_TRIM_MM,
  renderPrintStickerSvg,
  stickerPrintMetrics,
} from "../../site/js/qr-print-sticker.mjs";
import {
  overlayCenterLogoOnSvg,
  QR_FRAME_FOOTER_TEXT,
  QR_FRAME_LIVE_OBJECT_TEXT,
  renderHumanityQrFrameSvg,
} from "../../site/js/qr-branding.mjs";
import { renderPrintStickerFromScanUrl, renderScanQrMarkup } from "../src/resolver/scan-qr";
import QRCode from "qrcode";

const SCAN_URL =
  "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8";

async function sampleFramedSvg() {
  let svg = await QRCode.toString(SCAN_URL, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "Q",
  });
  svg = overlayCenterLogoOnSvg(svg);
  return renderHumanityQrFrameSvg(svg);
}

describe("stickerPrintMetrics", () => {
  it("defaults to 2 in trim with bleed and safe inset", () => {
    const m = stickerPrintMetrics();
    expect(m.trimMm).toBe(STICKER_TRIM_MM);
    expect(m.bleedMm).toBe(STICKER_BLEED_MM);
    expect(m.safeInsetMm).toBe(STICKER_SAFE_INSET_MM);
    expect(m.canvasMm).toBe(STICKER_TRIM_MM + 2 * STICKER_BLEED_MM);
    expect(m.safeSizeMm).toBe(STICKER_TRIM_MM - 2 * STICKER_SAFE_INSET_MM);
  });
});

describe("renderPrintStickerSvg", () => {
  it("uses mm dimensions and embeds framed QR with guides", async () => {
    const framed = await sampleFramedSvg();
    const sheet = renderPrintStickerSvg(framed);
    const m = stickerPrintMetrics();
    expect(sheet).toContain('class="hc-print-sticker-svg"');
    expect(sheet).toContain(`width="${m.canvasMm}mm"`);
    expect(sheet).toContain(`viewBox="0 0 ${m.canvasMm} ${m.canvasMm}"`);
    expect(sheet).toContain('class="hc-print-sticker-qr"');
    expect(sheet).toContain('class="hc-print-crop-marks"');
    expect(sheet).toContain(QR_FRAME_LIVE_OBJECT_TEXT);
    expect(sheet).toContain(QR_FRAME_FOOTER_TEXT);
  });

  it("omits guides when showGuides is false", async () => {
    const framed = await sampleFramedSvg();
    const sheet = renderPrintStickerSvg(framed, { showGuides: false });
    expect(sheet).not.toContain("hc-print-crop-marks");
    expect(sheet).not.toContain("hc-print-trim-guide");
  });
});

describe("renderPrintStickerFromScanUrl", () => {
  it("builds print sheet from scan URL with host lock", async () => {
    const sheet = await renderPrintStickerFromScanUrl(SCAN_URL);
    expect(sheet).toContain('class="hc-print-sticker-svg"');
    expect(sheet).toContain('class="hc-qr-network-glyph"');
    expect(sheet).not.toContain("scale(NaN)");
  });

  it("rejects off-host URLs", async () => {
    await expect(
      renderPrintStickerFromScanUrl("https://evil.com/c/x?q=qr_abc123456789")
    ).rejects.toThrow(/Official scan URL required/);
  });
});

describe("renderScanQrMarkup", () => {
  it("still returns pass-qr wrapper after refactor", async () => {
    const html = await renderScanQrMarkup(SCAN_URL);
    expect(html).toContain('class="hc-qr-frame pass-qr-svg"');
    expect(html).toContain('class="hc-qr-frame-svg"');
    expect(html).toContain(QR_FRAME_LIVE_OBJECT_TEXT);
  });
});

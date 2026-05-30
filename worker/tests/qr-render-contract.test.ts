import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  QR_BRANDED_RENDER_OPTIONS,
  QR_CENTER_LOGO_ENABLED,
  QR_FRAME_BRAND_MARK_ENABLED,
  finderLogoMetrics,
} from "../../site/js/qr-branding.mjs";
import {
  QR_DOWNLOAD_RENDER_WIDTH,
  QR_PREVIEW_RENDER_WIDTH,
} from "../../site/js/qr-render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("qr-render.mjs /created/ contract", () => {
  it("uses documented preview and download widths", () => {
    expect(QR_PREVIEW_RENDER_WIDTH).toBe(220);
    expect(QR_DOWNLOAD_RENDER_WIDTH).toBe(512);
  });

  it("routes preview and download through renderHumanityQrFrameToCanvas", () => {
    const src = readFileSync(join(root, "site/js/qr-render.mjs"), "utf8");
    expect(src).toContain("renderHumanityQrFrameToCanvas");
    expect(src).toContain("QR_PREVIEW_RENDER_WIDTH");
    expect(src).toContain("QR_DOWNLOAD_RENDER_WIDTH");
    expect(src).not.toMatch(/QRCode\.toDataURL/);
    expect(src).not.toMatch(/toCanvas\(/);
  });

  it("created.mjs loads qr-render for hero QR (not a separate encoder)", () => {
    const src = readFileSync(join(root, "site/js/created.mjs"), "utf8");
    expect(src).toContain('./qr-render.mjs');
    expect(src).toContain("renderQrToImage");
    expect(src).toContain("downloadQrPng");
    expect(src).toContain("renderBrandedQrToImage");
  });

  it("qr-render allows steward handoff URLs for branded encoding", () => {
    const renderSrc = readFileSync(join(root, "site/js/qr-render.mjs"), "utf8");
    expect(renderSrc).toContain("assertQrEncodeUrl");
    expect(renderSrc).toContain("qr-encode-url-core.mjs");

    const brandSrc = readFileSync(join(root, "site/js/qr-branding.mjs"), "utf8");
    expect(brandSrc).toContain("assertQrEncodeUrl");
    expect(brandSrc).not.toMatch(/assertOfficialScanUrl\(text\)/);
  });

  it("scan fallback loads versioned qr-render bundle", () => {
    const src = readFileSync(join(root, "worker/src/resolver/scan-html.ts"), "utf8");
    expect(src).toContain("qr-render.mjs?v=5");
  });
});

describe("branded generator flags (preview + Worker parity)", () => {
  it("uses finder mark only (no frame dot, no center bullseye)", () => {
    expect(QR_FRAME_BRAND_MARK_ENABLED).toBe(false);
    expect(QR_CENTER_LOGO_ENABLED).toBe(false);
  });

  it("places finder mark at production quiet-zone center", () => {
    const size = 37;
    const { cx, cy } = finderLogoMetrics(size);
    expect(cx).toBe(QR_BRANDED_RENDER_OPTIONS.margin + 3.5);
    expect(cy).toBe(cx);
  });
});

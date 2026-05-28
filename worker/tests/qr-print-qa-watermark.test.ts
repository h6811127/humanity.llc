import { describe, expect, it } from "vitest";

import {
  PRINT_QA_WATERMARK_HEADLINE,
  applyPrintQaWatermark,
} from "../../site/js/qr-print-qa-watermark.mjs";
import { renderPrintProofStickerFromScanUrl } from "../src/resolver/scan-qr";
import { renderPrintStickerFromScanUrl } from "../src/resolver/scan-qr";

const SCAN_URL =
  "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8";

describe("print QA watermark", () => {
  it("adds proof layer to sticker SVG", async () => {
    const plain = await renderPrintStickerFromScanUrl(SCAN_URL);
    const proof = await renderPrintProofStickerFromScanUrl(SCAN_URL);
    expect(plain).not.toContain("hc-print-qa-watermark");
    expect(proof).toContain('class="hc-print-qa-watermark"');
    expect(proof).toContain(PRINT_QA_WATERMARK_HEADLINE);
    expect(proof).toContain("DO NOT SHIP");
  });

  it("applyPrintQaWatermark is idempotent on valid SVG", async () => {
    const base = await renderPrintStickerFromScanUrl(SCAN_URL);
    const once = applyPrintQaWatermark(base);
    expect(once).toContain("hc-print-qa-watermark");
    expect(() => applyPrintQaWatermark(once)).not.toThrow();
  });
});

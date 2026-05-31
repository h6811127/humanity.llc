import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUYER_PRINT_FRAME_BACKGROUND,
  isBuyerPrintFrameBackground,
  normalizeBuyerPrintFrameBackground,
  resolveArtifactIntentPrintFrameBackground,
} from "../src/print/print-frame-background";
import { GLITCH_HOODIE_STORE_PRODUCT_ID } from "../src/print/print-catalog";

describe("print-frame-background", () => {
  it("defaults unknown values to full", () => {
    expect(normalizeBuyerPrintFrameBackground(undefined)).toBe("full");
    expect(normalizeBuyerPrintFrameBackground("")).toBe("full");
    expect(normalizeBuyerPrintFrameBackground("qr_only")).toBe("full");
  });

  it("accepts transparent", () => {
    expect(normalizeBuyerPrintFrameBackground("transparent")).toBe("transparent");
    expect(normalizeBuyerPrintFrameBackground("  transparent  ")).toBe("transparent");
  });

  it("validates buyer frame values", () => {
    expect(isBuyerPrintFrameBackground("full")).toBe(true);
    expect(isBuyerPrintFrameBackground("transparent")).toBe(true);
    expect(isBuyerPrintFrameBackground("qr_only")).toBe(false);
    expect(DEFAULT_BUYER_PRINT_FRAME_BACKGROUND).toBe("full");
  });

  it("allows transparent for Glitch navy variant", () => {
    expect(
      resolveArtifactIntentPrintFrameBackground({
        product_id: GLITCH_HOODIE_STORE_PRODUCT_ID,
        print_variant_id: "navy-m",
        print_frame_background: "transparent",
      })
    ).toBe("transparent");
  });

  it("coerces transparent to full for charcoal Glitch variant", () => {
    expect(
      resolveArtifactIntentPrintFrameBackground({
        product_id: GLITCH_HOODIE_STORE_PRODUCT_ID,
        print_variant_id: "charcoal-heather-m",
        print_frame_background: "transparent",
      })
    ).toBe("full");
  });

  it("coerces transparent to full for non-Glitch products", () => {
    expect(
      resolveArtifactIntentPrintFrameBackground({
        product_id: "sticker_personalized_v1",
        print_variant_id: null,
        print_frame_background: "transparent",
      })
    ).toBe("full");
  });
});

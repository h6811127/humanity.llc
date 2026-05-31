import { describe, expect, it } from "vitest";

import {
  artifactIntentSelectionKey,
  glitchArtifactIntentPrintFrameBackground,
  glitchHoodieGarmentSwatchHex,
  glitchPrintFramePreviewHint,
  glitchPrintPreviewUsesGarmentSwatchOnly,
  glitchPrintQrOverlayVisible,
  glitchPrintScanReliabilityWarning,
  GLITCH_PRINT_WHITE_CARD_ONLY_COLORS,
  glitchPrintTransparentOfferedForColor,
  isWhiteGarmentColor,
  normalizeGlitchPrintFrameBackground,
  readStoredGlitchPrintFrameBackground,
} from "../../site/js/shop-customize-printify-qr-core.mjs";

describe("glitchPrintQrOverlayVisible", () => {
  it("shows overlay on back view only", () => {
    expect(glitchPrintQrOverlayVisible("back")).toBe(true);
    expect(glitchPrintQrOverlayVisible("front")).toBe(false);
    expect(glitchPrintQrOverlayVisible("person-1-lifestyle")).toBe(false);
  });
});

describe("glitchPrintPreviewUsesGarmentSwatchOnly", () => {
  it("is true for transparent on back only without Printify mock", () => {
    expect(
      glitchPrintPreviewUsesGarmentSwatchOnly({
        frameBackground: "transparent",
        viewId: "back",
      })
    ).toBe(true);
    expect(
      glitchPrintPreviewUsesGarmentSwatchOnly({
        frameBackground: "transparent",
        viewId: "back",
        mockupEntry: { src_transparent: "/mock/transparent-back.jpg" },
      })
    ).toBe(false);
    expect(
      glitchPrintPreviewUsesGarmentSwatchOnly({
        frameBackground: "transparent",
        viewId: "front",
      })
    ).toBe(false);
    expect(
      glitchPrintPreviewUsesGarmentSwatchOnly({
        frameBackground: "full",
        viewId: "back",
      })
    ).toBe(false);
  });
});

describe("glitchHoodieGarmentSwatchHex", () => {
  it("returns a hex for known colors", () => {
    expect(glitchHoodieGarmentSwatchHex("Charcoal Heather")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("glitchPrintFramePreviewHint", () => {
  it("mentions Back when transparent on front", () => {
    expect(
      glitchPrintFramePreviewHint({ frameBackground: "transparent", viewId: "front" })
    ).toMatch(/Back view/i);
  });
});

describe("glitchPrintTransparentOfferedForColor", () => {
  it("blocks charcoal and royal blue only", () => {
    expect(GLITCH_PRINT_WHITE_CARD_ONLY_COLORS).toEqual(["Charcoal Heather", "Royal Blue"]);
    expect(GLITCH_PRINT_WHITE_CARD_ONLY_COLORS).not.toContain("Navy");
    expect(glitchPrintTransparentOfferedForColor("Charcoal Heather")).toBe(false);
    expect(glitchPrintTransparentOfferedForColor("Royal Blue")).toBe(false);
    expect(glitchPrintTransparentOfferedForColor("Navy")).toBe(true);
    expect(glitchPrintTransparentOfferedForColor("Black")).toBe(true);
  });
});

describe("glitchPrintScanReliabilityWarning", () => {
  it("warns when transparent is blocked for charcoal", () => {
    const msg = glitchPrintScanReliabilityWarning({
      color: "Charcoal Heather",
      frameBackground: "transparent",
    });
    expect(msg).toMatch(/white card/i);
    expect(msg).not.toBeNull();
  });

  it("warns on non-white garment with transparent selected", () => {
    const msg = glitchPrintScanReliabilityWarning({
      color: "Black",
      frameBackground: "transparent",
    });
    expect(msg).toMatch(/scannability|reliable/i);
  });

  it("is silent for white card on dark colors", () => {
    expect(
      glitchPrintScanReliabilityWarning({
        color: "Black",
        frameBackground: "full",
      })
    ).toBeNull();
  });

  it("is silent for white garment", () => {
    expect(
      glitchPrintScanReliabilityWarning({
        color: "White",
        frameBackground: "transparent",
      })
    ).toBeNull();
  });
});

describe("normalizeGlitchPrintFrameBackground", () => {
  it("defaults unknown values to full", () => {
    expect(normalizeGlitchPrintFrameBackground("")).toBe("full");
    expect(normalizeGlitchPrintFrameBackground("qr_only")).toBe("full");
    expect(normalizeGlitchPrintFrameBackground("transparent")).toBe("transparent");
  });
});

describe("isWhiteGarmentColor", () => {
  it("matches White only", () => {
    expect(isWhiteGarmentColor("White")).toBe(true);
    expect(isWhiteGarmentColor("Black")).toBe(false);
  });
});

describe("readStoredGlitchPrintFrameBackground", () => {
  it("returns a valid default when storage is empty", () => {
    expect(readStoredGlitchPrintFrameBackground()).toMatch(/^(full|transparent)$/);
  });
});

describe("artifactIntentSelectionKey", () => {
  it("includes print frame in cache key", () => {
    expect(
      artifactIntentSelectionKey(
        { print_variant_id: "navy-m", shopify_variant_id: "529" },
        "transparent"
      )
    ).toBe("navy-m|529|transparent");
    expect(
      artifactIntentSelectionKey(
        { print_variant_id: "navy-m", shopify_variant_id: "529" },
        "full"
      )
    ).toBe("navy-m|529|full");
  });
});

describe("glitchArtifactIntentPrintFrameBackground", () => {
  it("coerces transparent to full for charcoal", () => {
    expect(
      glitchArtifactIntentPrintFrameBackground("Charcoal Heather", "transparent")
    ).toBe("full");
  });

  it("keeps transparent for navy", () => {
    expect(glitchArtifactIntentPrintFrameBackground("Navy", "transparent")).toBe(
      "transparent"
    );
  });
});

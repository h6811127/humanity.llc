import { describe, expect, it } from "vitest";

import {
  CUSTOMIZE_PREVIEW_MIN_FORMING_MS,
  CUSTOMIZE_PREVIEW_ROW_STAGGER_MS,
  CUSTOMIZE_PREVIEW_SETTLE_MS,
  customizePreviewArriveSequenceMs,
  customizePreviewManifestoTeaser,
} from "../../site/js/shop-customize-preview-arrive-core.mjs";

describe("customizePreviewArriveSequenceMs", () => {
  it("sums forming, stagger, and settle like scan Path 2", () => {
    expect(customizePreviewArriveSequenceMs(0)).toBe(
      CUSTOMIZE_PREVIEW_MIN_FORMING_MS + CUSTOMIZE_PREVIEW_SETTLE_MS
    );
    expect(customizePreviewArriveSequenceMs(2)).toBe(
      CUSTOMIZE_PREVIEW_MIN_FORMING_MS +
        2 * CUSTOMIZE_PREVIEW_ROW_STAGGER_MS +
        CUSTOMIZE_PREVIEW_SETTLE_MS
    );
  });
});

describe("customizePreviewManifestoTeaser", () => {
  it("returns null for empty input", () => {
    expect(customizePreviewManifestoTeaser(null)).toBeNull();
    expect(customizePreviewManifestoTeaser("   ")).toBeNull();
  });

  it("uses first line of multiline manifesto", () => {
    expect(customizePreviewManifestoTeaser("Studio door\nOpen until 9")).toBe("Studio door");
  });

  it("truncates long single lines", () => {
    const long = "a".repeat(80);
    const teaser = customizePreviewManifestoTeaser(long, 20);
    expect(teaser).toHaveLength(20);
    expect(teaser?.endsWith("…")).toBe(true);
  });
});

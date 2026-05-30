import { describe, expect, it } from "vitest";

import {
  CUSTOMIZE_STRANGER_PREVIEW_CTA_LABEL,
  CUSTOMIZE_STRANGER_PREVIEW_HINT_BROWSER,
  buildCustomizeStrangerPreviewHref,
  customizeStrangerPreviewHint,
  customizeStrangerPreviewOpenedFeedback,
  shouldShowCustomizeStrangerPreview,
} from "../../site/js/shop-customize-stranger-preview-core.mjs";

const SCAN_URL = "https://humanity.llc/c/profile123?q=qr_planned";

describe("shouldShowCustomizeStrangerPreview", () => {
  it("shows only after preview settled with valid scan URL", () => {
    expect(
      shouldShowCustomizeStrangerPreview({
        previewSettled: true,
        scanUrl: SCAN_URL,
      })
    ).toBe(true);
    expect(
      shouldShowCustomizeStrangerPreview({
        previewSettled: false,
        scanUrl: SCAN_URL,
      })
    ).toBe(false);
    expect(
      shouldShowCustomizeStrangerPreview({
        previewSettled: true,
        scanUrl: "",
      })
    ).toBe(false);
  });
});

describe("buildCustomizeStrangerPreviewHref", () => {
  it("adds steward param for browser opens and return path in standalone", () => {
    expect(
      buildCustomizeStrangerPreviewHref(SCAN_URL, {
        standalone: false,
        pageOrigin: "https://humanity.llc",
      })
    ).toContain("hc_steward=1");
    const standaloneHref = buildCustomizeStrangerPreviewHref(SCAN_URL, {
      standalone: true,
      returnUrl: "https://humanity.llc/shop/customize/?hc_ref=customize_shop",
      pageOrigin: "https://humanity.llc",
    });
    expect(standaloneHref).toContain("hc_return=");
    const parsed = new URL(standaloneHref);
    expect(decodeURIComponent(parsed.searchParams.get("hc_return") ?? "")).toContain(
      "/shop/customize/"
    );
  });
});

describe("copy constants", () => {
  it("exposes CTA label and browser hint", () => {
    expect(CUSTOMIZE_STRANGER_PREVIEW_CTA_LABEL).toBe("Preview as stranger");
    expect(CUSTOMIZE_STRANGER_PREVIEW_HINT_BROWSER).toContain("new tab");
  });

  it("maps standalone hint and opened feedback", () => {
    expect(customizeStrangerPreviewHint(false)).toContain("new tab");
    expect(customizeStrangerPreviewHint(true)).toMatch(/Back to return/i);
    expect(customizeStrangerPreviewOpenedFeedback(false)).toMatch(/new tab/i);
  });
});

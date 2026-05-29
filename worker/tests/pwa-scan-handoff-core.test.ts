import { describe, expect, it, vi } from "vitest";

import {
  applyStewardScanLinkElement,
  isAllowedScanPreviewUrl,
  openStewardScanPreview,
  shouldAutoAdvanceSetupTestScan,
  stewardScanLinkHtmlAttrs,
  stewardScanOpenedFeedback,
  stewardScanOpensInNewTab,
  stewardScanPinListSub,
} from "../../site/js/pwa-scan-handoff-core.mjs";

describe("pwa-scan-handoff-core", () => {
  it("accepts http(s) scan URLs", () => {
    expect(isAllowedScanPreviewUrl("https://humanity.llc/c/abc?q=1")).toBe(true);
    expect(isAllowedScanPreviewUrl("http://127.0.0.1:8787/c/abc")).toBe(true);
  });

  it("rejects invalid scan URLs", () => {
    expect(isAllowedScanPreviewUrl("")).toBe(false);
    expect(isAllowedScanPreviewUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedScanPreviewUrl("not-a-url")).toBe(false);
  });

  it("opens new tab in browser mode", () => {
    const openWindow = vi.fn();
    const assign = vi.fn();
    expect(
      openStewardScanPreview("https://humanity.llc/c/abc", {
        standalone: false,
        openWindow,
        navigation: { assign },
      })
    ).toBe(true);
    expect(openWindow).toHaveBeenCalledWith(
      "https://humanity.llc/c/abc",
      "_blank",
      "noopener,noreferrer"
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("assigns same tab in standalone mode", () => {
    const openWindow = vi.fn();
    const assign = vi.fn();
    expect(
      openStewardScanPreview("https://humanity.llc/c/abc", {
        standalone: true,
        openWindow,
        navigation: { assign },
      })
    ).toBe(true);
    expect(assign).toHaveBeenCalledWith("https://humanity.llc/c/abc");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("maps standalone to link attrs and feedback", () => {
    expect(stewardScanOpensInNewTab(false)).toBe(true);
    expect(stewardScanOpensInNewTab(true)).toBe(false);
    expect(stewardScanLinkHtmlAttrs(true)).toBe("");
    expect(stewardScanLinkHtmlAttrs(false)).toContain('target="_blank"');
    expect(stewardScanOpenedFeedback(true)).toMatch(/Back to return/i);
    expect(stewardScanOpenedFeedback(false)).toMatch(/new tab/i);
    expect(shouldAutoAdvanceSetupTestScan(true)).toBe(false);
    expect(shouldAutoAdvanceSetupTestScan(false)).toBe(true);
  });

  it("applyStewardScanLinkElement toggles target", () => {
    /** @type {Record<string, string>} */
    const attrs = {};
    const anchor = {
      setAttribute(name, value) {
        attrs[name] = value;
      },
      removeAttribute(name) {
        delete attrs[name];
      },
      getAttribute(name) {
        return attrs[name] ?? null;
      },
      hasAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attrs, name);
      },
    };
    applyStewardScanLinkElement(anchor, false);
    expect(anchor.getAttribute("target")).toBe("_blank");
    applyStewardScanLinkElement(anchor, true);
    expect(anchor.hasAttribute("target")).toBe(false);
    expect(anchor.hasAttribute("rel")).toBe(false);
  });

  it("stewardScanPinListSub drops new-tab copy in standalone", () => {
    expect(stewardScanPinListSub(true, { hasQrId: true })).toBe("Scan");
    expect(stewardScanPinListSub(false, { hasQrId: true })).toContain("new tab");
  });
});

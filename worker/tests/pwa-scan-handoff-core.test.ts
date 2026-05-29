import { describe, expect, it, vi } from "vitest";

import {
  appendStewardPreviewReturnToScanUrl,
  applyStewardScanLinkElement,
  isAllowedScanPreviewUrl,
  isAllowedStewardPreviewReturnUrl,
  openStewardScanPreview,
  shouldAutoAdvanceSetupTestScan,
  stewardPreviewReturnBannerLabel,
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

  it("assigns same tab in standalone mode with return param", () => {
    const openWindow = vi.fn();
    const assign = vi.fn();
    const setItem = vi.fn();
    expect(
      openStewardScanPreview("https://humanity.llc/c/abc?q=1", {
        standalone: true,
        returnUrl: "https://humanity.llc/created/?profile_id=p#setup-test",
        pageOrigin: "https://humanity.llc",
        openWindow,
        navigation: { assign },
        storage: { setItem },
      })
    ).toBe(true);
    expect(assign).toHaveBeenCalledWith(expect.stringContaining("hc_return="));
    expect(setItem).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("rejects off-origin steward preview return URLs", () => {
    expect(
      isAllowedStewardPreviewReturnUrl("https://evil.example/created/", "https://humanity.llc")
    ).toBe(false);
    expect(
      isAllowedStewardPreviewReturnUrl(
        "https://humanity.llc/created/?profile_id=x",
        "https://humanity.llc"
      )
    ).toBe(true);
  });

  it("appends hc_return to scan URL", () => {
    const out = appendStewardPreviewReturnToScanUrl(
      "https://humanity.llc/c/p?q=1",
      "https://humanity.llc/created/?profile_id=p#setup-test",
      "https://humanity.llc"
    );
    expect(out).toContain("hc_return=");
    const parsed = new URL(out);
    expect(parsed.searchParams.get("hc_return")).toContain("/created/");
  });

  it("labels setup return banner", () => {
    expect(
      stewardPreviewReturnBannerLabel("https://humanity.llc/created/#setup-test")
    ).toBe("Back to setup");
    expect(stewardPreviewReturnBannerLabel("https://humanity.llc/wallet/")).toBe(
      "Back to My objects"
    );
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

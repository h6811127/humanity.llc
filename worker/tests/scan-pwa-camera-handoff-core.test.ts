import { describe, expect, it } from "vitest";

import { parseHumanityScanUrl, isHumanityScanHost } from "../../site/js/device-hub-open-scan-core.mjs";
import {
  appendStewardScanQueryParam,
  isStewardScanQueryParam,
  prioritizeStewardHandoffOnScan,
  readStewardScanQueryParamFromSearch,
  shouldDeferScanActorBandForStewardHandoff,
  shouldShowScanPwaCameraHandoff,
  STEWARD_SCAN_QUERY_PARAM,
} from "../../site/js/scan-pwa-camera-handoff-core.mjs";
import { buildStewardScanPreviewHref } from "../../site/js/pwa-scan-handoff-core.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const SCAN_URL = `https://humanity.llc/c/${PROFILE_ID}?q=qr_abc`;

describe("parseHumanityScanUrl", () => {
  it("accepts scan URLs and bare profile ids", () => {
    expect(parseHumanityScanUrl(`https://humanity.llc/c/${PROFILE_ID}?q=qr_abc`)).toBe(
      `https://humanity.llc/c/${PROFILE_ID}?q=qr_abc`
    );
    expect(parseHumanityScanUrl(PROFILE_ID, "https://humanity.llc")).toBe(
      `https://humanity.llc/c/${PROFILE_ID}`
    );
  });

  it("rejects non-scan paths", () => {
    expect(parseHumanityScanUrl("https://humanity.llc/wallet/")).toBeNull();
    expect(parseHumanityScanUrl("https://example.com/c/x")).toBeNull();
  });
});

describe("isHumanityScanHost", () => {
  it("allows production and local dev hosts", () => {
    expect(isHumanityScanHost("humanity.llc")).toBe(true);
    expect(isHumanityScanHost("www.humanity.llc")).toBe(true);
    expect(isHumanityScanHost("127.0.0.1")).toBe(true);
  });
});

describe("steward scan query param (S5)", () => {
  it("detects truthy hc_steward values", () => {
    expect(isStewardScanQueryParam(new URLSearchParams("hc_steward=1"))).toBe(true);
    expect(isStewardScanQueryParam(new URLSearchParams("hc_steward=true"))).toBe(true);
    expect(isStewardScanQueryParam(new URLSearchParams("hc_steward=0"))).toBe(false);
    expect(readStewardScanQueryParamFromSearch("?hc_steward=1&q=qr_x")).toBe(true);
  });

  it("appends hc_steward=1 idempotently", () => {
    expect(appendStewardScanQueryParam(SCAN_URL)).toBe(`${SCAN_URL}&${STEWARD_SCAN_QUERY_PARAM}=1`);
    expect(appendStewardScanQueryParam(`${SCAN_URL}&hc_steward=1`)).toBe(`${SCAN_URL}&hc_steward=1`);
  });

  it("buildStewardScanPreviewHref adds param for browser (non-standalone) opens", () => {
    expect(
      buildStewardScanPreviewHref(SCAN_URL, { standalone: false, pageOrigin: "https://humanity.llc" })
    ).toBe(`${SCAN_URL}&${STEWARD_SCAN_QUERY_PARAM}=1`);
    expect(
      buildStewardScanPreviewHref(SCAN_URL, {
        standalone: true,
        returnUrl: "https://humanity.llc/created/?profile_id=x",
        pageOrigin: "https://humanity.llc",
      })
    ).toContain("hc_return=");
    expect(
      buildStewardScanPreviewHref(SCAN_URL, {
        standalone: true,
        returnUrl: "https://humanity.llc/created/?profile_id=x",
        pageOrigin: "https://humanity.llc",
      })
    ).not.toContain(`${STEWARD_SCAN_QUERY_PARAM}=`);
  });
});

describe("shouldShowScanPwaCameraHandoff", () => {
  it("shows for iOS Safari with empty wallet", () => {
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: false, walletCount: 0 })
    ).toBe(true);
  });

  it("shows for iOS Safari steward landing even with saved wallet rows", () => {
    expect(
      shouldShowScanPwaCameraHandoff({
        isIosWebKit: true,
        standalone: false,
        walletCount: 3,
        stewardLanding: true,
      })
    ).toBe(true);
  });

  it("hides in PWA, off iOS, or when wallet has cards without steward param", () => {
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: true, walletCount: 0 })
    ).toBe(false);
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: false, standalone: false, walletCount: 0 })
    ).toBe(false);
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: false, walletCount: 1 })
    ).toBe(false);
    expect(
      shouldShowScanPwaCameraHandoff({
        isIosWebKit: true,
        standalone: false,
        walletCount: 1,
        stewardLanding: false,
      })
    ).toBe(false);
  });
});

describe("shouldDeferScanActorBandForStewardHandoff", () => {
  it("defers actor band on steward Safari landing without tab keys", () => {
    expect(
      shouldDeferScanActorBandForStewardHandoff({
        stewardLanding: true,
        isIosWebKit: true,
        standalone: false,
        hasTabKeys: false,
      })
    ).toBe(true);
  });

  it("does not defer when keys are in tab or not steward landing", () => {
    expect(
      shouldDeferScanActorBandForStewardHandoff({
        stewardLanding: true,
        isIosWebKit: true,
        standalone: false,
        hasTabKeys: true,
      })
    ).toBe(false);
    expect(
      shouldDeferScanActorBandForStewardHandoff({
        stewardLanding: false,
        isIosWebKit: true,
        standalone: false,
        hasTabKeys: false,
      })
    ).toBe(false);
  });
});

describe("prioritizeStewardHandoffOnScan", () => {
  it("sets body dataset and scrolls vouch group", () => {
    let scrolled = false;
    const doc = {
      body: { dataset: {} },
      querySelector: () => ({
        scrollIntoView: () => {
          scrolled = true;
        },
      }),
    };
    const win = { requestAnimationFrame: (fn: () => void) => fn() };
    prioritizeStewardHandoffOnScan({ document: doc, window: win });
    expect(doc.body.dataset.stewardScanHandoff).toBe("1");
    expect(scrolled).toBe(true);
  });
});

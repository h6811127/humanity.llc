import { describe, expect, it } from "vitest";

import { parseHumanityScanUrl, isHumanityScanHost } from "../../site/js/device-hub-open-scan-core.mjs";
import { shouldShowScanPwaCameraHandoff } from "../../site/js/scan-pwa-camera-handoff-core.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

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

describe("shouldShowScanPwaCameraHandoff", () => {
  it("shows for iOS Safari with empty wallet", () => {
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: false, walletCount: 0 })
    ).toBe(true);
  });

  it("hides in PWA, off iOS, or when wallet has cards", () => {
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: true, walletCount: 0 })
    ).toBe(false);
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: false, standalone: false, walletCount: 0 })
    ).toBe(false);
    expect(
      shouldShowScanPwaCameraHandoff({ isIosWebKit: true, standalone: false, walletCount: 1 })
    ).toBe(false);
  });
});

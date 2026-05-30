import { describe, expect, it } from "vitest";

import {
  barcodeDetectorSupported,
  resolveScannedQrToScanUrl,
  shouldShowHubQrScanner,
} from "../../site/js/device-hub-qr-scanner-core.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_E2eKeyLossSadPath1";
const SCAN_URL = `https://humanity.llc/c/${PROFILE_ID}?q=${QR_ID}`;

describe("resolveScannedQrToScanUrl (S3)", () => {
  it("accepts official HTTPS scan URLs from QR decode", () => {
    expect(resolveScannedQrToScanUrl(SCAN_URL)).toBe(SCAN_URL);
  });

  it("rejects non-official hosts and paths without qr_id", () => {
    expect(resolveScannedQrToScanUrl("https://example.com/c/x?q=qr_abcdefgh")).toBeNull();
    expect(resolveScannedQrToScanUrl(`https://humanity.llc/c/${PROFILE_ID}`)).toBeNull();
  });
});

describe("shouldShowHubQrScanner", () => {
  it("shows when at least one card is saved", () => {
    expect(shouldShowHubQrScanner(0)).toBe(false);
    expect(shouldShowHubQrScanner(1)).toBe(true);
  });
});

describe("barcodeDetectorSupported", () => {
  it("returns boolean without throwing", () => {
    expect(typeof barcodeDetectorSupported()).toBe("boolean");
  });
});

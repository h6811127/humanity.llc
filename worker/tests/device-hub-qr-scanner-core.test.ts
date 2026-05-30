import { describe, expect, it } from "vitest";

import {
  decodeQrFromImageData,
  hubCameraScanSupported,
  pickQrScanBackend,
} from "../../site/js/device-hub-qr-scanner-decode-core.mjs";
import {
  barcodeDetectorSupported,
  resolveScannedQrToScanUrl,
  shouldShowHubQrScanner,
  shouldShowHubScanQrChrome,
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

describe("shouldShowHubScanQrChrome (Phase B)", () => {
  it("requires saved cards and standalone PWA", () => {
    expect(shouldShowHubScanQrChrome({ walletCount: 0, standalone: true })).toBe(false);
    expect(shouldShowHubScanQrChrome({ walletCount: 1, standalone: false })).toBe(false);
    expect(shouldShowHubScanQrChrome({ walletCount: 1, standalone: true })).toBe(true);
  });
});

describe("pickQrScanBackend (Safari fallback)", () => {
  it("returns jsqr when camera exists but BarcodeDetector does not", () => {
    const originalBd = globalThis.BarcodeDetector;
    const originalNavigator = globalThis.navigator;
    // @ts-expect-error test override
    delete globalThis.BarcodeDetector;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: { getUserMedia: () => Promise.resolve({}) },
      },
    });
    try {
      expect(barcodeDetectorSupported()).toBe(false);
      expect(hubCameraScanSupported()).toBe(true);
      expect(pickQrScanBackend()).toBe("jsqr");
    } finally {
      if (originalBd) globalThis.BarcodeDetector = originalBd;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});

describe("decodeQrFromImageData", () => {
  it("delegates to jsQR and returns decoded text", () => {
    const jsQr = () => ({ data: SCAN_URL });
    expect(decodeQrFromImageData(new Uint8ClampedArray(4), 2, 2, jsQr)).toBe(SCAN_URL);
  });

  it("returns null when jsQR finds nothing", () => {
    const jsQr = () => null;
    expect(decodeQrFromImageData(new Uint8ClampedArray(4), 2, 2, jsQr)).toBeNull();
  });
});

describe("barcodeDetectorSupported", () => {
  it("returns boolean without throwing", () => {
    expect(typeof barcodeDetectorSupported()).toBe("boolean");
  });
});

import { describe, expect, it } from "vitest";

import {
  assertOfficialScanUrl,
  buildOfficialScanUrl,
  isAllowedScanHost,
  isOfficialScanUrl,
  OFFICIAL_SCAN_PRODUCTION_HOST,
  validateOfficialScanUrl,
} from "../../site/js/qr-scan-url-lock.mjs";
import { renderScanQrMarkup } from "../src/resolver/scan-qr";
import { resolveScanUrl } from "../src/resolver/scan-state";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

const GOOD = `https://${OFFICIAL_SCAN_PRODUCTION_HOST}/c/${PROFILE}?q=${QR}`;

describe("isAllowedScanHost", () => {
  it("allows production and local dev hosts", () => {
    expect(isAllowedScanHost("humanity.llc")).toBe(true);
    expect(isAllowedScanHost("127.0.0.1")).toBe(true);
    expect(isAllowedScanHost("localhost")).toBe(true);
    expect(isAllowedScanHost("evil.com")).toBe(false);
  });
});

describe("validateOfficialScanUrl", () => {
  it("accepts canonical production scan URLs", () => {
    expect(validateOfficialScanUrl(GOOD, { profileId: PROFILE, qrId: QR })).toEqual({
      ok: true,
    });
    expect(
      validateOfficialScanUrl(`http://127.0.0.1:8787/c/${PROFILE}?q=${QR}`, {
        profileId: PROFILE,
        qrId: QR,
      }).ok
    ).toBe(true);
  });

  it("rejects external and homepage URLs", () => {
    expect(validateOfficialScanUrl("https://youtube.com/watch?v=1").ok).toBe(false);
    expect(validateOfficialScanUrl("https://humanity.llc/").ok).toBe(false);
    expect(validateOfficialScanUrl("https://humanity.llc/create/").ok).toBe(false);
    expect(
      validateOfficialScanUrl(`http://${OFFICIAL_SCAN_PRODUCTION_HOST}/c/${PROFILE}?q=${QR}`).ok
    ).toBe(false);
  });

  it("rejects profile or qr mismatch", () => {
    expect(
      validateOfficialScanUrl(GOOD, { profileId: "wrong_profile_id____________", qrId: QR }).ok
    ).toBe(false);
    expect(validateOfficialScanUrl(GOOD, { profileId: PROFILE, qrId: "qr_wrongid12345678" }).ok)
      .toBe(false);
  });

  it("rejects extra query parameters", () => {
    expect(
      validateOfficialScanUrl(`${GOOD}&redirect=https://evil.com`, {
        profileId: PROFILE,
        qrId: QR,
      }).ok
    ).toBe(false);
  });
});

describe("resolveScanUrl host lock", () => {
  it("falls back to built URL when stored payload is off-host", () => {
    const origin = "https://humanity.llc";
    const url = resolveScanUrl(origin, PROFILE, QR, "https://phish.example/c/x?q=qr_bad");
    expect(url).toBe(GOOD);
  });

  it("returns null when payload invalid and profile or qr id missing", () => {
    expect(resolveScanUrl("https://humanity.llc", null, null, "https://evil.com/")).toBeNull();
  });

  it("uses built URL when stored payload is invalid but ids are known", () => {
    expect(resolveScanUrl("https://humanity.llc", PROFILE, QR, "https://evil.com/")).toBe(GOOD);
  });
});

describe("buildOfficialScanUrl", () => {
  it("returns a validated production URL", () => {
    expect(buildOfficialScanUrl(PROFILE, QR)).toBe(GOOD);
    expect(
      buildOfficialScanUrl(PROFILE, QR, `http://127.0.0.1:8787`)
    ).toBe(`http://127.0.0.1:8787/c/${PROFILE}?q=${QR}`);
  });

  it("throws for invalid origins", () => {
    expect(() => buildOfficialScanUrl(PROFILE, QR, "https://evil.com")).toThrow(
      /Official scan URL required/
    );
  });
});

describe("official QR generators", () => {
  it("renderScanQrMarkup refuses non-official URLs", async () => {
    await expect(
      renderScanQrMarkup("https://evil.com/c/stolen?q=qr_123456789012345678")
    ).rejects.toThrow(/Official scan URL required/);
  });

  it("assertOfficialScanUrl accepts good URLs", () => {
    expect(assertOfficialScanUrl(GOOD)).toBe(GOOD);
    expect(isOfficialScanUrl(GOOD)).toBe(true);
  });
});

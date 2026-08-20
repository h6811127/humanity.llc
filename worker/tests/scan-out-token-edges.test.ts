import { describe, expect, it } from "vitest";

import {
  issueScanOutToken,
  validateExternalDestinationUrl,
  verifyScanOutToken,
} from "../src/resolver/scan-out-token";

const SECRET = "test-scan-out-secret";
const OTHER_SECRET = "other-scan-out-secret";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OTHER_PROFILE = "8Ym2nQ4rT6vW8yZ1aB3cD5eF";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const TARGET = "https://example.com/path";

describe("validateExternalDestinationUrl edges", () => {
  it("rejects credentials, javascript, and non-local http", () => {
    expect(validateExternalDestinationUrl("https://user:pass@example.com/x")).toMatchObject({
      ok: false,
      code: "credentials",
    });
    expect(validateExternalDestinationUrl("javascript:alert(1)")).toMatchObject({
      ok: false,
      code: "protocol",
    });
    expect(validateExternalDestinationUrl("http://example.com/x")).toMatchObject({
      ok: false,
      code: "protocol",
    });
  });

  it("allows local http and rejects operator subdomains", () => {
    const local = validateExternalDestinationUrl("http://127.0.0.1:8788/preview");
    expect(local.ok).toBe(true);

    expect(validateExternalDestinationUrl("https://www.humanity.llc/docs")).toMatchObject({
      ok: false,
      code: "operator_host",
    });
    expect(validateExternalDestinationUrl("https://api.humanity.llc/v1")).toMatchObject({
      ok: false,
      code: "operator_host",
    });
  });
});

describe("scan-out token binding and expiry edges", () => {
  it("rejects issue with invalid profile or qr ids", async () => {
    await expect(
      issueScanOutToken(SECRET, { profileId: "too-short", qrId: QR, url: TARGET })
    ).rejects.toThrow(/profile_id/);
    await expect(
      issueScanOutToken(SECRET, { profileId: PROFILE, qrId: "qr_bad", url: TARGET })
    ).rejects.toThrow(/qr_id/);
    await expect(
      issueScanOutToken(SECRET, {
        profileId: PROFILE,
        qrId: QR,
        url: "https://humanity.llc/c/x",
      })
    ).rejects.toThrow(/outside humanity\.llc/);
  });

  it("rejects tokens bound to another card or signed with another secret", async () => {
    const token = await issueScanOutToken(SECRET, {
      profileId: PROFILE,
      qrId: QR,
      url: TARGET,
      nowSec: 1_700_000_000,
      ttlSec: 600,
    });

    const wrongCard = await verifyScanOutToken(SECRET, token, {
      profileId: OTHER_PROFILE,
      nowSec: 1_700_000_100,
    });
    expect(wrongCard).toMatchObject({ ok: false, code: "profile" });

    const wrongSecret = await verifyScanOutToken(OTHER_SECRET, token, {
      profileId: PROFILE,
      nowSec: 1_700_000_100,
    });
    expect(wrongSecret).toMatchObject({ ok: false, code: "signature" });
  });

  it("rejects malformed and tampered tokens", async () => {
    const token = await issueScanOutToken(SECRET, {
      profileId: PROFILE,
      qrId: QR,
      url: TARGET,
      nowSec: 1_700_000_000,
      ttlSec: 600,
    });

    expect(
      await verifyScanOutToken(SECRET, "not-a-token", {
        profileId: PROFILE,
        nowSec: 1_700_000_100,
      })
    ).toMatchObject({ ok: false, code: "format" });

    const [body] = token.split(".");
    expect(
      await verifyScanOutToken(SECRET, `${body}.AAAA`, {
        profileId: PROFILE,
        nowSec: 1_700_000_100,
      })
    ).toMatchObject({ ok: false, code: "signature" });
  });
});

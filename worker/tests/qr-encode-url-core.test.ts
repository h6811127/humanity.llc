import { describe, expect, it } from "vitest";

import { buildOfficialScanUrl } from "../../site/js/qr-scan-url-lock.mjs";
import {
  assertQrEncodeUrl,
  credentialCodeForEncodeUrl,
} from "../../site/js/qr-encode-url-core.mjs";
import { buildStewardDualQrMaterials } from "../../site/js/steward-dual-qr-core.mjs";
import { deriveCredentialCodeSync } from "../../site/js/qr-credential-code.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";

describe("assertQrEncodeUrl (RC-1 shared guard)", () => {
  it("accepts official scan URLs", () => {
    const scan = buildOfficialScanUrl(PROFILE, QR);
    expect(() => assertQrEncodeUrl(scan)).not.toThrow();
  });

  it("accepts steward handoff /v/{code} URLs", () => {
    const scan = buildOfficialScanUrl(PROFILE, QR);
    const handoff = buildStewardDualQrMaterials(scan).stewardHandoffUrl;
    expect(handoff).toMatch(/^https:\/\/humanity\.llc\/v\//);
    expect(() => assertQrEncodeUrl(handoff!)).not.toThrow();
  });

  it("rejects arbitrary URLs", () => {
    expect(() => assertQrEncodeUrl("https://example.com/c/x?q=qr_y")).toThrow(
      /not an official scan or steward handoff link/
    );
  });
});

describe("credentialCodeForEncodeUrl", () => {
  it("derives HC code from scan URL", () => {
    const scan = buildOfficialScanUrl(PROFILE, QR);
    expect(credentialCodeForEncodeUrl(scan)).toBe(
      deriveCredentialCodeSync(PROFILE, QR)
    );
  });

  it("derives HC code from steward handoff URL", () => {
    const scan = buildOfficialScanUrl(PROFILE, QR);
    const handoff = buildStewardDualQrMaterials(scan).stewardHandoffUrl!;
    expect(credentialCodeForEncodeUrl(handoff)).toBe(
      deriveCredentialCodeSync(PROFILE, QR)
    );
  });
});

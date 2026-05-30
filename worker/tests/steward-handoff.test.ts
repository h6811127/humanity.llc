import { describe, expect, it } from "vitest";

import {
  buildStewardHandoffScanUrl,
  buildStewardHandoffShortUrl,
  decodeStewardHandoffCode,
  encodeStewardHandoffCode,
  parseStewardHandoffScanParts,
} from "../../site/js/steward-handoff-code-core.mjs";
import { appendStewardScanQueryParam } from "../../site/js/scan-pwa-camera-handoff-core.mjs";
import { handleGetStewardHandoff } from "../src/resolver/steward-handoff";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const SCAN_URL = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

describe("steward handoff code (S6)", () => {
  it("round-trips profile and qr ids", () => {
    const code = encodeStewardHandoffCode(PROFILE, QR);
    expect(code).toBeTruthy();
    expect(decodeStewardHandoffCode(code)).toEqual({ profileId: PROFILE, qrId: QR });
  });

  it("rejects invalid codes", () => {
    expect(decodeStewardHandoffCode("not-valid")).toBeNull();
    expect(encodeStewardHandoffCode("bad", QR)).toBeNull();
  });

  it("builds short and scan URLs from official scan links", () => {
    const parts = parseStewardHandoffScanParts(SCAN_URL);
    expect(parts).toEqual({ profileId: PROFILE, qrId: QR });
    expect(buildStewardHandoffShortUrl(SCAN_URL)).toMatch(
      new RegExp(`^https://humanity\\.llc/v/[A-Za-z0-9_-]+$`)
    );
    expect(buildStewardHandoffScanUrl(parts!, "https://humanity.llc")).toBe(SCAN_URL);
  });
});

describe("handleGetStewardHandoff", () => {
  it("renders interstitial with steward scan URL", async () => {
    const code = encodeStewardHandoffCode(PROFILE, QR)!;
    const res = await handleGetStewardHandoff(
      new Request(`https://humanity.llc/v/${code}`),
      code
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-HC-Steward-Handoff")).toBe("interstitial");
    const html = await res.text();
    expect(html).toContain("Open this scan in your Home Screen app");
    expect(html).toContain(appendStewardScanQueryParam(SCAN_URL));
    expect(html).toContain("?go=1");
  });

  it("redirects with go=1", async () => {
    const code = encodeStewardHandoffCode(PROFILE, QR)!;
    const res = await handleGetStewardHandoff(
      new Request(`https://humanity.llc/v/${code}?go=1`),
      code
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(appendStewardScanQueryParam(SCAN_URL));
  });

  it("returns 400 for malformed code", async () => {
    const res = await handleGetStewardHandoff(
      new Request("https://humanity.llc/v/not-valid"),
      "not-valid"
    );
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain("invalid");
  });
});

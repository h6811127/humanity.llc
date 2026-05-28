import { describe, expect, it } from "vitest";

import {
  buildScanOutInterstitialUrl,
  issueScanOutToken,
  resolveScanOutHmacSecret,
  validateExternalDestinationUrl,
  verifyScanOutToken,
} from "../src/resolver/scan-out-token";
import { guardScanResponse, scanRedirectQueryBlocked } from "../src/resolver/scan-redirect-guard";
import { renderScanOutInterstitialPage } from "../src/resolver/scan-out-html";
import { malformedScanView } from "../src/resolver/scan-state";

const SECRET = "test-scan-out-secret";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const TARGET = "https://example.com/path";

describe("validateExternalDestinationUrl", () => {
  it("accepts https off-operator destinations", () => {
    const r = validateExternalDestinationUrl(TARGET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.domain).toBe("example.com");
      expect(r.known).toBe(false);
    }
  });

  it("rejects humanity.llc and scan URLs", () => {
    expect(validateExternalDestinationUrl("https://humanity.llc/c/x?q=qr_abc").ok).toBe(
      false
    );
    expect(
      validateExternalDestinationUrl(
        `https://humanity.llc/c/${PROFILE}?q=${QR}`
      ).ok
    ).toBe(false);
  });

  it("marks known domain suffixes", () => {
    const r = validateExternalDestinationUrl("https://www.github.com/org/repo");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.known).toBe(true);
  });
});

describe("scan-out token", () => {
  it("round-trips a signed token", async () => {
    const token = await issueScanOutToken(SECRET, {
      profileId: PROFILE,
      qrId: QR,
      url: TARGET,
      nowSec: 1_700_000_000,
      ttlSec: 600,
    });
    const v = await verifyScanOutToken(SECRET, token, {
      profileId: PROFILE,
      nowSec: 1_700_000_100,
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payload.url).toBe(TARGET);
      expect(v.domain).toBe("example.com");
    }
  });

  it("rejects expired tokens", async () => {
    const token = await issueScanOutToken(SECRET, {
      profileId: PROFILE,
      qrId: QR,
      url: TARGET,
      nowSec: 1_700_000_000,
      ttlSec: 60,
    });
    const v = await verifyScanOutToken(SECRET, token, {
      profileId: PROFILE,
      nowSec: 1_700_010_000,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("expired");
  });

  it("builds interstitial URL on operator origin", async () => {
    const url = await buildScanOutInterstitialUrl(
      "https://humanity.llc",
      SECRET,
      PROFILE,
      QR,
      TARGET
    );
    expect(url).toMatch(
      /^https:\/\/humanity\.llc\/c\/7Xk9mP2nQ4rT6vW8yZ1aB3cD5\/out\?t=/
    );
  });
});

describe("scan redirect guard", () => {
  it("blocks redirect query params on scan URLs", () => {
    const url = new URL(
      `https://humanity.llc/c/${PROFILE}?q=${QR}&redirect=https://evil.com`
    );
    expect(scanRedirectQueryBlocked(url)).toBe(true);
  });

  it("blocks external Location on scan responses", () => {
    const req = new Request(`https://humanity.llc/c/${PROFILE}?q=${QR}`);
    const res = new Response(null, {
      status: 302,
      headers: { Location: "https://evil.com/phish" },
    });
    const out = guardScanResponse(req, res);
    expect(out.status).toBe(403);
    expect(out.headers.get("X-HC-Scan-Redirect-Blocked")).toBe("1");
  });

  it("allows same-origin redirects", () => {
    const req = new Request(`https://humanity.llc/c/${PROFILE}?q=${QR}`);
    const res = new Response(null, {
      status: 302,
      headers: { Location: "/c/other?q=qr_other123456789" },
    });
    expect(guardScanResponse(req, res).status).toBe(302);
  });
});

describe("renderScanOutInterstitialPage", () => {
  it("includes domain, steward line, and explicit continue", () => {
    const vm = malformedScanView(PROFILE, QR, "https://humanity.llc");
    const html = renderScanOutInterstitialPage(
      {
        domain: "example.com",
        targetUrl: TARGET,
        known: false,
        stayUrl: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
        continueUrl: `https://humanity.llc/c/${PROFILE}/out?t=x&go=1`,
        vm,
      },
      "https://humanity.llc"
    );
    expect(html).toContain("example.com");
    expect(html).toContain("Stay on Humanity");
    expect(html).toContain("Continue to example.com");
    expect(html).toContain("No automatic redirect");
    expect(html).toContain("scan-out-warning");
  });
});

describe("resolveScanOutHmacSecret", () => {
  it("uses env secret when set", () => {
    expect(resolveScanOutHmacSecret({ SCAN_OUT_HMAC_SECRET: "prod" })).toBe("prod");
  });
});

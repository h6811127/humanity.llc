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
  const REDIRECT_QUERY_KEYS = [
    "redirect",
    "url",
    "next",
    "continue",
    "dest",
    "destination",
    "goto",
    "return",
    "return_to",
    "u",
    "link",
    "out",
  ] as const;

  it.each(REDIRECT_QUERY_KEYS)(
    "blocks banned redirect query key %s (case-insensitive)",
    (key) => {
      const lower = new URL(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&${key}=https://evil.com`
      );
      const upper = new URL(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&${key.toUpperCase()}=https://evil.com`
      );
      const mixed = new URL(
        `https://humanity.llc/c/${PROFILE}?q=${QR}&${key[0].toUpperCase()}${key.slice(1)}=https://evil.com`
      );
      expect(scanRedirectQueryBlocked(lower)).toBe(true);
      expect(scanRedirectQueryBlocked(upper)).toBe(true);
      expect(scanRedirectQueryBlocked(mixed)).toBe(true);
    }
  );

  it("does not block ordinary scan query params", () => {
    const url = new URL(
      `https://humanity.llc/c/${PROFILE}?q=${QR}&proof=1&tab=live&view=status`
    );
    expect(scanRedirectQueryBlocked(url)).toBe(false);
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
    const relative = new Response(null, {
      status: 302,
      headers: { Location: "/c/other?q=qr_other123456789" },
    });
    const absolute = new Response(null, {
      status: 301,
      headers: { Location: `https://humanity.llc/c/${PROFILE}?q=${QR}` },
    });
    expect(guardScanResponse(req, relative).status).toBe(302);
    expect(guardScanResponse(req, absolute).status).toBe(301);
  });

  it("passes through non-redirect responses and redirects without Location", () => {
    const req = new Request(`https://humanity.llc/c/${PROFILE}?q=${QR}`);
    const ok = new Response("scan", { status: 200 });
    const noLocation = new Response(null, { status: 302 });
    expect(guardScanResponse(req, ok)).toBe(ok);
    expect(guardScanResponse(req, noLocation)).toBe(noLocation);
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

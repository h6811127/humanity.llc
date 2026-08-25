import { describe, expect, it } from "vitest";

import {
  guardScanResponse,
  scanRedirectQueryBlocked,
} from "../src/resolver/scan-redirect-guard";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const QR = "qr_E2eWakketTest9";
const SCAN = `https://humanity.llc/c/${PROFILE}?q=${QR}`;

const BLOCKED_KEYS = [
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

function scanUrl(extra: string): URL {
  return new URL(`${SCAN}&${extra}`);
}

describe("scanRedirectQueryBlocked", () => {
  it("does not block the ordinary scan query", () => {
    expect(scanRedirectQueryBlocked(new URL(SCAN))).toBe(false);
    expect(scanRedirectQueryBlocked(scanUrl("intent=deploy&region=cr"))).toBe(
      false
    );
  });

  it("blocks every banned redirect key, case-insensitively", () => {
    for (const key of BLOCKED_KEYS) {
      expect(scanRedirectQueryBlocked(scanUrl(`${key}=https://example.test`))).toBe(
        true
      );
      expect(
        scanRedirectQueryBlocked(scanUrl(`${key.toUpperCase()}=https://example.test`))
      ).toBe(true);
    }
  });

  it("does not treat a banned word in a value as a redirect param", () => {
    expect(scanRedirectQueryBlocked(scanUrl("note=redirect"))).toBe(false);
  });
});

describe("guardScanResponse", () => {
  const req = new Request(SCAN);

  it("rewrites only off-origin 3xx Location headers", () => {
    const blocked = guardScanResponse(
      req,
      new Response(null, {
        status: 301,
        headers: { Location: "https://example.test/leave" },
      })
    );
    expect(blocked.status).toBe(403);
    expect(blocked.headers.get("X-HC-Scan-Redirect-Blocked")).toBe("1");

    const sameOrigin = guardScanResponse(
      req,
      new Response(null, {
        status: 302,
        headers: { Location: `https://humanity.llc/c/${PROFILE}?q=${QR}` },
      })
    );
    expect(sameOrigin.status).toBe(302);

    const lookalike = guardScanResponse(
      req,
      new Response(null, {
        status: 302,
        headers: { Location: "https://humanity.llc.example.test/c/x" },
      })
    );
    expect(lookalike.status).toBe(403);
  });

  it("treats protocol-relative Location as external", () => {
    const out = guardScanResponse(
      req,
      new Response(null, {
        status: 302,
        headers: { Location: "//example.test/leave" },
      })
    );
    expect(out.status).toBe(403);
  });

  it("leaves non-redirect statuses and empty Location alone", () => {
    expect(
      guardScanResponse(req, new Response("ok", { status: 200 })).status
    ).toBe(200);
    expect(
      guardScanResponse(req, new Response("missing", { status: 404 })).status
    ).toBe(404);
    expect(
      guardScanResponse(
        req,
        new Response(null, { status: 302, headers: { Location: "" } })
      ).status
    ).toBe(302);
  });
});

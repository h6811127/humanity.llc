import { describe, expect, it } from "vitest";

import {
  buildCanonicalSiteRedirectUrl,
  CANONICAL_SITE_HOST,
  CANONICAL_SITE_ORIGIN,
  formatOriginDebugHubLine,
  isCanonicalSiteHost,
  isPagesPreviewHost,
  resolverApiOriginForHostname,
  shouldRedirectWwwToCanonical,
  shouldShowOriginDebugInHub,
} from "../../site/js/canonical-origin-core.mjs";
import {
  buildCanonicalRedirectUrl,
  maybeCanonicalOriginRedirect,
  shouldRedirectWwwToCanonical as workerShouldRedirect,
} from "../src/http/canonical-origin";

describe("canonical-origin-core (RC-13)", () => {
  it("detects canonical and www hosts", () => {
    expect(isCanonicalSiteHost("humanity.llc")).toBe(true);
    expect(isCanonicalSiteHost("www.humanity.llc")).toBe(false);
    expect(shouldRedirectWwwToCanonical("www.humanity.llc")).toBe(true);
    expect(shouldRedirectWwwToCanonical("humanity.llc")).toBe(false);
    expect(isPagesPreviewHost("abc.pages.dev")).toBe(true);
  });

  it("builds apex redirect preserving path and query", () => {
    expect(
      buildCanonicalSiteRedirectUrl({
        hostname: "www.humanity.llc",
        pathname: "/wallet/",
        search: "?hc_debug=1",
        hash: "#setup",
      })
    ).toBe("https://humanity.llc/wallet/?hc_debug=1#setup");
    expect(CANONICAL_SITE_HOST).toBe("humanity.llc");
  });

  it("formats debug hub lines for preview and www", () => {
    expect(
      formatOriginDebugHubLine({
        origin: "https://humanity.llc",
        hostname: "humanity.llc",
      })
    ).toContain("canonical");
    expect(
      formatOriginDebugHubLine({
        origin: "https://www.humanity.llc",
        hostname: "www.humanity.llc",
      })
    ).toContain("humanity.llc");
    expect(
      formatOriginDebugHubLine({
        origin: "https://foo.pages.dev",
        hostname: "foo.pages.dev",
      })
    ).toContain("preview");
  });

  it("shows origin debug on canonical and preview hosts", () => {
    expect(shouldShowOriginDebugInHub({ hostname: "humanity.llc" })).toBe(true);
    expect(shouldShowOriginDebugInHub({ hostname: "foo.pages.dev" })).toBe(true);
    expect(shouldShowOriginDebugInHub({ hostname: "localhost" })).toBe(false);
  });

  it("resolver API uses apex on www and preview (PWA RC-1)", () => {
    expect(
      resolverApiOriginForHostname({
        hostname: "www.humanity.llc",
        protocol: "https:",
        pageOrigin: "https://www.humanity.llc",
      })
    ).toBe(CANONICAL_SITE_ORIGIN);
    expect(
      resolverApiOriginForHostname({
        hostname: "humanity.llc",
        protocol: "https:",
        pageOrigin: "https://humanity.llc",
      })
    ).toBe("https://humanity.llc");
    expect(
      resolverApiOriginForHostname({
        hostname: "foo.pages.dev",
        protocol: "https:",
        pageOrigin: "https://foo.pages.dev",
      })
    ).toBe(CANONICAL_SITE_ORIGIN);
    expect(
      resolverApiOriginForHostname({
        hostname: "127.0.0.1",
        protocol: "http:",
        pageOrigin: "http://127.0.0.1:8788",
      })
    ).toBe("http://127.0.0.1:8787");
  });
});

describe("worker canonical-origin redirect (RC-13)", () => {
  it("redirects www resolver requests to apex", () => {
    expect(workerShouldRedirect("www.humanity.llc")).toBe(true);
    const url = new URL("https://www.humanity.llc/.well-known/hc/v1/health?q=1");
    expect(buildCanonicalRedirectUrl(url)).toBe(
      "https://humanity.llc/.well-known/hc/v1/health?q=1"
    );
    const req = new Request(url.toString());
    const res = maybeCanonicalOriginRedirect(req);
    expect(res?.status).toBe(301);
    expect(res?.headers.get("Location")).toBe(
      "https://humanity.llc/.well-known/hc/v1/health?q=1"
    );
  });

  it("does not redirect apex or localhost", () => {
    expect(
      maybeCanonicalOriginRedirect(new Request("https://humanity.llc/"))
    ).toBeNull();
    expect(
      maybeCanonicalOriginRedirect(new Request("http://127.0.0.1:8787/health"))
    ).toBeNull();
  });
});

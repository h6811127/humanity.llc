import { describe, expect, it } from "vitest";

import {
  governanceProcessUrls,
  originFromScanUrl,
} from "../src/resolver/scan-governance";

describe("governanceProcessUrls", () => {
  it("builds absolute process links from a site origin", () => {
    expect(governanceProcessUrls("https://humanity.llc")).toEqual({
      data_policy_url: "https://humanity.llc/data-policy.html",
      architecture_url: "https://humanity.llc/architecture.html",
      appeal_url: "https://humanity.llc/appeal/",
    });
  });

  it("strips a trailing slash on the origin once", () => {
    expect(governanceProcessUrls("https://humanity.llc/").appeal_url).toBe(
      "https://humanity.llc/appeal/"
    );
  });
});

describe("originFromScanUrl", () => {
  it("returns the origin of a valid scan URL", () => {
    expect(
      originFromScanUrl(
        "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_7Xk9mP2nQ4rT6vW8"
      )
    ).toBe("https://humanity.llc");
  });

  it("falls back when the scan URL is missing or malformed", () => {
    expect(originFromScanUrl(null)).toBe("https://humanity.llc");
    expect(originFromScanUrl(undefined)).toBe("https://humanity.llc");
    expect(originFromScanUrl("not a url")).toBe("https://humanity.llc");
    expect(originFromScanUrl("", "https://example.test")).toBe("https://example.test");
  });
});

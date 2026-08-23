import { describe, expect, it } from "vitest";

import { clientIp } from "../src/http/resolver";

describe("clientIp", () => {
  it("prefers CF-Connecting-IP over X-Forwarded-For", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: {
        "CF-Connecting-IP": "203.0.113.10",
        "X-Forwarded-For": "198.51.100.1, 203.0.113.10",
      },
    });
    expect(clientIp(request)).toBe("203.0.113.10");
  });

  it("uses only the first X-Forwarded-For hop when CF-Connecting-IP is absent", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: {
        "X-Forwarded-For": "  198.51.100.22, 203.0.113.9, 10.0.0.1  ",
      },
    });
    expect(clientIp(request)).toBe("198.51.100.22");
  });

  it("returns unknown when no client IP headers are present", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health");
    expect(clientIp(request)).toBe("unknown");
  });

  it("treats a present empty CF-Connecting-IP as the client value", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: {
        "CF-Connecting-IP": "",
        "X-Forwarded-For": "198.51.100.40",
      },
    });
    expect(clientIp(request)).toBe("");
  });
});

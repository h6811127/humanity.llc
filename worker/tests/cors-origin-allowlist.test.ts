import { describe, expect, it } from "vitest";

import {
  corsHeaders,
  errorResponse,
  withCors,
} from "../src/http/resolver";

function headersFor(origin: string | null, extra: HeadersInit = {}): Record<string, string> {
  const requestHeaders = new Headers(extra);
  if (origin !== null) requestHeaders.set("Origin", origin);
  return corsHeaders(
    new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: requestHeaders,
    })
  ) as Record<string, string>;
}

describe("cors origin allowlist", () => {
  it("allows production, subdomain, local, and Pages preview hosts", () => {
    for (const origin of [
      "https://humanity.llc",
      "https://www.humanity.llc",
      "https://app.humanity.llc",
      "http://localhost:8788",
      "http://127.0.0.1:8788",
      "https://413ac9a6.humanity-llc.pages.dev",
    ]) {
      expect(headersFor(origin)["Access-Control-Allow-Origin"]).toBe(origin);
    }
  });

  it("rejects missing, empty, and malformed Origin", () => {
    expect(headersFor(null)).toEqual({});
    expect(headersFor("")).toEqual({});
    expect(headersFor("not-a-url")).toEqual({});
    expect(headersFor("https://")).toEqual({});
  });

  it("rejects lookalike and off-allowlist hosts", () => {
    for (const origin of [
      "https://evil.com",
      "https://humanity.llc.evil.com",
      "https://evilhumanity.llc",
      "https://nothumanity.llc",
      "https://pages.dev",
      "https://humanity.llc.attacker.example",
      "http://192.168.1.10:8788",
    ]) {
      expect(headersFor(origin), origin).toEqual({});
    }
  });

  it("sets private-network only when the preflight requests it with true", () => {
    const withFlag = headersFor("http://localhost:8788", {
      "Access-Control-Request-Private-Network": "true",
    });
    expect(withFlag["Access-Control-Allow-Private-Network"]).toBe("true");

    const wrongValue = headersFor("http://localhost:8788", {
      "Access-Control-Request-Private-Network": "1",
    });
    expect(wrongValue["Access-Control-Allow-Private-Network"]).toBeUndefined();
  });
});

describe("withCors", () => {
  it("leaves the response unchanged when Origin is denied", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: { Origin: "https://evil.com" },
    });
    const inner = new Response(null, { status: 204, headers: { "X-Inner": "1" } });
    const wrapped = withCors(request, inner);
    expect(wrapped).toBe(inner);
    expect(wrapped.status).toBe(204);
    expect(wrapped.headers.get("X-Inner")).toBe("1");
    expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("copies allowlist headers onto the response for an allowed Origin", () => {
    const request = new Request("https://humanity.llc/.well-known/hc/v1/health", {
      headers: { Origin: "https://humanity.llc" },
    });
    const wrapped = withCors(request, new Response("ok", { status: 200 }));
    expect(wrapped.status).toBe(200);
    expect(wrapped.headers.get("Access-Control-Allow-Origin")).toBe("https://humanity.llc");
    expect(wrapped.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("errorResponse", () => {
  it("returns the JSON error envelope with resolver headers", async () => {
    const res = errorResponse("UNAUTHORIZED", "Invalid or expired session.", 401);
    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("X-Resolver-Operator")).toBe("humanity.llc");
    await expect(res.json()).resolves.toEqual({
      error: "UNAUTHORIZED",
      message: "Invalid or expired session.",
    });
  });
});

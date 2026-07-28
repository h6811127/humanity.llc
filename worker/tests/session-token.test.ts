import { describe, expect, it } from "vitest";

import {
  generateSessionToken,
  hashSessionToken,
  parseBearerToken,
} from "../src/steward/session-token";

function requestWithAuth(header: string | null): Request {
  const headers = header == null ? undefined : { Authorization: header };
  return new Request("https://humanity.llc/.well-known/hc/v1/steward/quota", {
    headers,
  });
}

describe("parseBearerToken", () => {
  it("returns null for missing or malformed Authorization headers", () => {
    expect(parseBearerToken(requestWithAuth(null))).toBeNull();
    expect(parseBearerToken(requestWithAuth(""))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Basic abc.def"))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Bearer"))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Bearer "))).toBeNull();
  });

  it("extracts bearer tokens case-insensitively and trims whitespace", () => {
    expect(parseBearerToken(requestWithAuth("Bearer tok_abc123"))).toBe("tok_abc123");
    expect(parseBearerToken(requestWithAuth("bearer tok_abc123"))).toBe("tok_abc123");
    expect(parseBearerToken(requestWithAuth("  BEARER   tok_abc123  "))).toBe("tok_abc123");
  });
});

describe("hashSessionToken / generateSessionToken", () => {
  it("hashes tokens as stable lowercase hex SHA-256 digests", async () => {
    const digest = await hashSessionToken("session-token-fixture");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashSessionToken("session-token-fixture")).toBe(digest);
    expect(await hashSessionToken("session-token-fixture-other")).not.toBe(digest);
  });

  it("generates opaque base64url tokens of expected entropy", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toBe(b);
  });
});

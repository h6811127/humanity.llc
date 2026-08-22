import { describe, expect, it } from "vitest";

import {
  generateSessionToken,
  hashSessionToken,
  parseBearerToken,
} from "../src/steward/session-token";

function requestWithAuth(header: string | null): Request {
  const headers = new Headers();
  if (header !== null) headers.set("Authorization", header);
  return new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
    headers,
  });
}

describe("parseBearerToken", () => {
  it("returns the token from a Bearer header", () => {
    expect(parseBearerToken(requestWithAuth("Bearer abc.def-ghi"))).toBe("abc.def-ghi");
  });

  it("accepts case-insensitive Bearer and trims the token", () => {
    expect(parseBearerToken(requestWithAuth("bearer   tok_session01  "))).toBe(
      "tok_session01"
    );
    expect(parseBearerToken(requestWithAuth("  BEARER tok_session01"))).toBe(
      "tok_session01"
    );
  });

  it("returns null for missing, empty, or non-Bearer credentials", () => {
    expect(parseBearerToken(requestWithAuth(null))).toBeNull();
    expect(parseBearerToken(requestWithAuth(""))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Bearer"))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Bearer   "))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Basic tok_session01"))).toBeNull();
    expect(parseBearerToken(requestWithAuth("Token tok_session01"))).toBeNull();
  });
});

describe("hashSessionToken", () => {
  it("hashes the raw token with SHA-256 hex and never returns the raw value", async () => {
    const token = "tok_session01";
    const hash = await hashSessionToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(await hashSessionToken(token)).toBe(hash);
  });

  it("produces different hashes for different tokens", async () => {
    const a = await hashSessionToken("tok_session01");
    const b = await hashSessionToken("tok_session02");
    expect(a).not.toBe(b);
  });
});

describe("generateSessionToken", () => {
  it("returns URL-safe unpadded base64 of 32 random bytes", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.includes("=")).toBe(false);
    expect(token.length).toBe(43);
    expect(generateSessionToken()).not.toBe(token);
  });
});

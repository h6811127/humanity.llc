import { describe, expect, it } from "vitest";

import {
  assertAsciiBearerToken,
  normalizeOperatorAuditToken,
} from "../scripts/hosted-rollout-token.mjs";

describe("hosted-rollout-token", () => {
  it("accepts ASCII tokens", () => {
    expect(normalizeOperatorAuditToken("abc123_XYZ-ok")).toBe("abc123_XYZ-ok");
  });

  it("rejects Unicode ellipsis placeholders", () => {
    expect(() => assertAsciiBearerToken("token…here")).toThrow(/2026/);
    expect(() => assertAsciiBearerToken("token…here")).toThrow(/ellipsis/);
  });

  it("returns null for empty token", () => {
    expect(normalizeOperatorAuditToken("")).toBeNull();
    expect(normalizeOperatorAuditToken(undefined)).toBeNull();
  });
});

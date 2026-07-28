import { describe, expect, it } from "vitest";

import { operatorAuditAuthorized } from "../src/http/operator-auth";

function requestWithAuth(header: string | null): Request {
  const headers = header == null ? undefined : { Authorization: header };
  return new Request("https://humanity.llc/.well-known/hc/v1/operator/vouch-audit-flags", {
    headers,
  });
}

describe("operatorAuditAuthorized", () => {
  const token = "op-audit-token-0123456789abcdef";

  it("rejects when OPERATOR_AUDIT_TOKEN is unset or empty", () => {
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${token}`), undefined)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${token}`), "")).toBe(false);
  });

  it("rejects missing, non-Bearer, and empty bearer credentials", () => {
    expect(operatorAuditAuthorized(requestWithAuth(null), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth("Basic abc"), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth("Bearer"), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth("Bearer "), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth("Bearer    "), token)).toBe(false);
  });

  it("rejects length-mismatched tokens without accepting prefixes", () => {
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${token}x`), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${token.slice(0, -1)}`), token)).toBe(
      false
    );
    expect(operatorAuditAuthorized(requestWithAuth("Bearer short"), token)).toBe(false);
  });

  it("rejects same-length wrong tokens and accepts exact matches", () => {
    const wrong = "x".repeat(token.length);
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${wrong}`), token)).toBe(false);
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer ${token}`), token)).toBe(true);
    expect(operatorAuditAuthorized(requestWithAuth(`Bearer  ${token}  `), token)).toBe(true);
  });
});

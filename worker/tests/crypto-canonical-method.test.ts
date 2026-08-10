import { describe, expect, it } from "vitest";

import {
  CANONICALIZATION,
  CRYPTO_ERROR,
  CryptoVerifyError,
  assertCanonicalizationMethod,
  toCanonicalBytes,
  toCanonicalJson,
} from "../src/crypto/index.ts";

describe("assertCanonicalizationMethod", () => {
  it("accepts undefined (legacy payloads omit the field)", () => {
    expect(() => assertCanonicalizationMethod(undefined)).not.toThrow();
  });

  it("accepts the protocol JCS method", () => {
    expect(() => assertCanonicalizationMethod(CANONICALIZATION)).not.toThrow();
    expect(CANONICALIZATION).toBe("JCS");
  });

  it("rejects alternate canonicalization methods that would confuse verify", () => {
    expect(() => assertCanonicalizationMethod("JCS-strict")).toThrow(CryptoVerifyError);
    try {
      assertCanonicalizationMethod("none");
      expect.unreachable("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CryptoVerifyError);
      expect((err as CryptoVerifyError).code).toBe(CRYPTO_ERROR.INVALID_CANONICALIZATION);
      expect((err as Error).message).toMatch(/Expected canonicalization "JCS"/);
    }
  });
});

describe("toCanonicalJson non-serializable edges", () => {
  it("rejects values that cannot be JCS-serialized", () => {
    expect(() => toCanonicalJson(undefined)).toThrow(CryptoVerifyError);
    try {
      toCanonicalJson(() => "fn");
      expect.unreachable("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CryptoVerifyError);
      expect((err as CryptoVerifyError).code).toBe(CRYPTO_ERROR.INVALID_CANONICALIZATION);
    }
  });

  it("encodes UTF-8 bytes of the canonical JSON string", () => {
    const json = toCanonicalJson({ a: 1, z: 2 });
    const bytes = toCanonicalBytes({ z: 2, a: 1 });
    expect(new TextDecoder().decode(bytes)).toBe(json);
    expect(json).toBe('{"a":1,"z":2}');
  });
});

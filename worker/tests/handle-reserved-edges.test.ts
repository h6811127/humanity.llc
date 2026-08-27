import { describe, expect, it } from "vitest";

import { validateCreateHandle } from "../../site/js/create-handle-validation-core.mjs";
import { CRYPTO_ERROR, CryptoVerifyError } from "../src/crypto/errors";
import {
  HANDLE_REGEX,
  RESERVED_HANDLES,
  normalizeHandle,
  validateHandle,
} from "../src/validation/handle";

/** Frozen reserved set — removing any of these is a squatting / route-collision regression. */
const EXPECTED_RESERVED_HANDLES = [
  "admin",
  "administrator",
  "host",
  "resolver",
  "system",
  "test",
  "example",
  "support",
  "help",
  "info",
  "root",
  "api",
  "www",
  "hc",
  "humanity",
  "commons",
  "profile",
  "profiles",
  "card",
  "cards",
  "qr",
  "resolve",
  "revoked",
  "suspended",
  "null",
  "undefined",
  "false",
  "true",
  "0",
  "1",
  "print",
  "orders",
  "shop",
  "verify",
  "verification",
  "governance",
  "constitution",
] as const;

function expectReserved(raw: string): void {
  try {
    validateHandle(raw);
    throw new Error(`expected reserved handle to throw: ${raw}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CryptoVerifyError);
    expect((error as CryptoVerifyError).code).toBe(CRYPTO_ERROR.MISSING_REQUIRED_FIELD);
    expect((error as Error).message).toMatch(/reserved/i);
  }
}

function expectInvalidFormat(raw: string): void {
  try {
    validateHandle(raw);
    throw new Error(`expected invalid handle to throw: ${raw}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CryptoVerifyError);
    expect((error as CryptoVerifyError).code).toBe(CRYPTO_ERROR.MISSING_REQUIRED_FIELD);
    expect((error as Error).message).toMatch(/3–32|lowercase/i);
  }
}

describe("handle reserved set", () => {
  it("keeps the published reserved list intact", () => {
    expect([...RESERVED_HANDLES].sort()).toEqual([...EXPECTED_RESERVED_HANDLES].sort());
  });

  it("rejects every reserved handle after trim + lowercase", () => {
    for (const handle of EXPECTED_RESERVED_HANDLES) {
      if (!HANDLE_REGEX.test(handle)) continue;
      expectReserved(handle);
      expectReserved(`  ${handle.toUpperCase()}  `);
    }
  });

  it("rejects reserved names that fail the regex via format, not reserved copy", () => {
    expectInvalidFormat("0");
    expectInvalidFormat("1");
  });

  it("allows nearby non-reserved handles", () => {
    expect(validateHandle("adminx")).toBe("adminx");
    expect(validateHandle("shop_door")).toBe("shop_door");
    expect(validateHandle("humanityllc")).toBe("humanityllc");
    expect(validateHandle("verify_me")).toBe("verify_me");
  });
});

describe("handle regex bounds", () => {
  it("normalizes trim and case before validation", () => {
    expect(normalizeHandle("  River_Example  ")).toBe("river_example");
    expect(validateHandle("  River_Example  ")).toBe("river_example");
  });

  it("accepts 3- and 32-character handles on the published alphabet", () => {
    expect(validateHandle("abc")).toBe("abc");
    expect(validateHandle("a" + "b".repeat(31))).toBe("a" + "b".repeat(31));
    expect(validateHandle("a1_z")).toBe("a1_z");
  });

  it("rejects too short, too long, and illegal characters", () => {
    expectInvalidFormat("ab");
    expectInvalidFormat("a" + "b".repeat(32));
    expectInvalidFormat("1bad");
    expectInvalidFormat("_leading");
    expectInvalidFormat("has-hyphen");
    expectInvalidFormat("has space");
    expectInvalidFormat("café");
  });
});

describe("create-form reserved parity", () => {
  it("rejects the same reserved names on the client helper", () => {
    for (const handle of EXPECTED_RESERVED_HANDLES) {
      if (!HANDLE_REGEX.test(handle)) continue;
      const result = validateCreateHandle(handle);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toMatch(/reserved/i);
      }
    }
  });

  it("accepts the same nearby non-reserved handles on the client helper", () => {
    expect(validateCreateHandle("shop_door")).toEqual({
      ok: true,
      normalized: "shop_door",
    });
  });
});

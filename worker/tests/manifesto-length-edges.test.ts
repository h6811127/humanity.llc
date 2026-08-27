import { describe, expect, it } from "vitest";

import { CRYPTO_ERROR, CryptoVerifyError } from "../src/crypto/errors";
import { validateManifestoLine } from "../src/validation/manifesto";

function expectManifestoRejected(raw: string, message: RegExp): void {
  try {
    validateManifestoLine(raw);
    throw new Error("expected manifesto validation to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(CryptoVerifyError);
    expect((error as CryptoVerifyError).code).toBe(CRYPTO_ERROR.MISSING_REQUIRED_FIELD);
    expect((error as Error).message).toMatch(message);
  }
}

describe("validateManifestoLine length bounds", () => {
  it("rejects empty and whitespace-only lines after trim", () => {
    expectManifestoRejected("", /1–280/);
    expectManifestoRejected("   ", /1–280/);
    expectManifestoRejected("\n\t", /1–280/);
  });

  it("accepts 1- and 280-character plain text", () => {
    expect(validateManifestoLine("x")).toBe("x");
    expect(validateManifestoLine("x".repeat(280))).toBe("x".repeat(280));
    expect(validateManifestoLine(`  ${"x".repeat(280)}  `)).toBe("x".repeat(280));
  });

  it("rejects 281 characters after trim", () => {
    expectManifestoRejected("x".repeat(281), /1–280/);
    expectManifestoRejected(`  ${"x".repeat(281)}  `, /1–280/);
  });

  it("still rejects HTML markup inside an otherwise valid length", () => {
    expectManifestoRejected("<b>hi</b>", /HTML/i);
    expectManifestoRejected("ok <img src=x>", /HTML/i);
  });
});

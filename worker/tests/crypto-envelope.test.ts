import { describe, expect, it } from "vitest";

import { CANONICALIZATION, SIGNATURE_ALG } from "../src/crypto/constants";
import { isSignatureBlock, stripSignature } from "../src/crypto/envelope";

const VALID_BLOCK = {
  alg: SIGNATURE_ALG,
  public_key: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
  signature: "sigBase58ExampleValue0001",
  signed_at: "2026-08-06T10:00:00.000Z",
  canonicalization: CANONICALIZATION,
};

describe("isSignatureBlock", () => {
  it("accepts a well-formed Ed25519 signature block", () => {
    expect(isSignatureBlock(VALID_BLOCK)).toBe(true);
  });

  it("accepts a block without optional canonicalization", () => {
    const { canonicalization: _c, ...noCanon } = VALID_BLOCK;
    expect(isSignatureBlock(noCanon)).toBe(true);
  });

  it("rejects missing, null, and non-object values", () => {
    expect(isSignatureBlock(undefined)).toBe(false);
    expect(isSignatureBlock(null)).toBe(false);
    expect(isSignatureBlock("Ed25519")).toBe(false);
    expect(isSignatureBlock([])).toBe(false);
  });

  it("rejects wrong algorithm and non-string required fields", () => {
    expect(isSignatureBlock({ ...VALID_BLOCK, alg: "RSA" })).toBe(false);
    expect(isSignatureBlock({ ...VALID_BLOCK, public_key: 1 })).toBe(false);
    expect(isSignatureBlock({ ...VALID_BLOCK, signature: null })).toBe(false);
    expect(isSignatureBlock({ ...VALID_BLOCK, signed_at: undefined })).toBe(false);
    expect(
      isSignatureBlock({
        alg: SIGNATURE_ALG,
        public_key: VALID_BLOCK.public_key,
        signature: VALID_BLOCK.signature,
      })
    ).toBe(false);
  });
});

describe("stripSignature", () => {
  it("removes only the top-level signature field before canonicalization", () => {
    const doc = {
      type: "humanity_card",
      version: "1.0",
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      nested: { signature: "must-remain" },
      signature: VALID_BLOCK,
    };
    expect(stripSignature(doc)).toEqual({
      type: "humanity_card",
      version: "1.0",
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      nested: { signature: "must-remain" },
    });
  });

  it("returns a shallow copy when signature is already absent", () => {
    const doc = { type: "humanity_card", version: "1.0" };
    const stripped = stripSignature(doc);
    expect(stripped).toEqual(doc);
    expect(stripped).not.toBe(doc);
  });
});

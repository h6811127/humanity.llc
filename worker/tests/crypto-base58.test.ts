import { describe, expect, it } from "vitest";

import {
  decodeBase58,
  decodePublicKeyBase58,
  decodeSignatureBase58,
  encodeBase58,
} from "../src/crypto/base58";
import { CRYPTO_ERROR, CryptoVerifyError } from "../src/crypto/errors";

function expectCryptoThrow(fn: () => unknown, code: string, message?: RegExp | string): void {
  try {
    fn();
    throw new Error("expected CryptoVerifyError");
  } catch (err) {
    expect(err).toBeInstanceOf(CryptoVerifyError);
    expect((err as CryptoVerifyError).code).toBe(code);
    if (message) {
      expect((err as CryptoVerifyError).message).toMatch(message);
    }
  }
}

describe("base58 encode/decode", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128, 64]);
    expect(Array.from(decodeBase58(encodeBase58(bytes)))).toEqual(Array.from(bytes));
  });

  it("rejects empty and non-string input", () => {
    expectCryptoThrow(() => decodeBase58(""), CRYPTO_ERROR.INVALID_BASE58, /empty/i);
    expectCryptoThrow(
      // @ts-expect-error intentional invalid input
      () => decodeBase58(null),
      CRYPTO_ERROR.INVALID_BASE58
    );
  });

  it("rejects characters outside the Bitcoin alphabet (0 O I l)", () => {
    for (const ch of ["0", "O", "I", "l", "!", " "]) {
      expectCryptoThrow(
        () => decodeBase58(`ab${ch}cd`),
        CRYPTO_ERROR.INVALID_BASE58,
        ch
      );
    }
  });
});

describe("decodePublicKeyBase58", () => {
  it("accepts a 32-byte Ed25519 public key", () => {
    const pk = new Uint8Array(32).fill(7);
    const encoded = encodeBase58(pk);
    expect(Array.from(decodePublicKeyBase58(encoded))).toEqual(Array.from(pk));
  });

  it("rejects wrong-length keys as INVALID_PUBLIC_KEY", () => {
    const short = encodeBase58(new Uint8Array(16).fill(1));
    expectCryptoThrow(
      () => decodePublicKeyBase58(short),
      CRYPTO_ERROR.INVALID_PUBLIC_KEY,
      /32 bytes/
    );
  });
});

describe("decodeSignatureBase58", () => {
  it("accepts a 64-byte Ed25519 signature", () => {
    const sig = new Uint8Array(64).fill(9);
    const encoded = encodeBase58(sig);
    expect(Array.from(decodeSignatureBase58(encoded))).toEqual(Array.from(sig));
  });

  it("rejects wrong-length signatures as INVALID_SIGNATURE (CARD_INVALID_SIGNATURE)", () => {
    const short = encodeBase58(new Uint8Array(32).fill(2));
    expectCryptoThrow(
      () => decodeSignatureBase58(short),
      CRYPTO_ERROR.INVALID_SIGNATURE,
      /64 bytes/
    );
  });
});

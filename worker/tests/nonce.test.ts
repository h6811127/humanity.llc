import { describe, expect, it } from "vitest";

import { CRYPTO_ERROR } from "../src/crypto/errors";
import { extractNonce, NonceReplayGuard } from "../src/crypto/nonce";

describe("extractNonce", () => {
  it("returns a non-empty string nonce", () => {
    expect(extractNonce({ nonce: "nonce_abc123" })).toBe("nonce_abc123");
  });

  it("rejects missing, empty, and non-string nonce values", () => {
    expect(extractNonce({})).toBeNull();
    expect(extractNonce({ nonce: "" })).toBeNull();
    expect(extractNonce({ nonce: "   " })).toBe("   ");
    expect(extractNonce({ nonce: 42 as unknown as string })).toBeNull();
    expect(extractNonce({ nonce: null as unknown as string })).toBeNull();
    expect(extractNonce({ nonce: ["nonce_array"] as unknown as string })).toBeNull();
  });
});

describe("NonceReplayGuard", () => {
  it("accepts a nonce once and rejects replay in the same scope", () => {
    const guard = new NonceReplayGuard("profile_a");
    expect(guard.consume("nonce_1")).toBe(true);
    expect(guard.consume("nonce_1")).toBe(false);
  });

  it("isolates nonces across scopes so the same value can be used per profile", () => {
    const a = new NonceReplayGuard("profile_a");
    const b = new NonceReplayGuard("profile_b");
    expect(a.consume("shared_nonce")).toBe(true);
    expect(b.consume("shared_nonce")).toBe(true);
    expect(a.consume("shared_nonce")).toBe(false);
  });

  it("assertFresh throws REPLAYED_NONCE on reuse", () => {
    const guard = new NonceReplayGuard("profile_a");
    guard.assertFresh("nonce_fresh");
    expect(() => guard.assertFresh("nonce_fresh")).toThrowError(
      expect.objectContaining({
        name: "CryptoVerifyError",
        code: CRYPTO_ERROR.REPLAYED_NONCE,
      })
    );
  });

  it("reset clears seen nonces for the guard instance", () => {
    const guard = new NonceReplayGuard("profile_a");
    expect(guard.consume("nonce_reset")).toBe(true);
    guard.reset();
    expect(guard.consume("nonce_reset")).toBe(true);
  });
});

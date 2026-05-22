import { CRYPTO_ERROR, CryptoVerifyError } from "./errors";

/**
 * In-memory replay guard for signed payloads that carry a `nonce`.
 * Resolver will persist seen nonces in D1 at M4; harness uses this for tests.
 */
export class NonceReplayGuard {
  private readonly seen = new Set<string>();

  /**
   * @param scope Prefix to avoid cross-profile collisions (e.g. profile_id).
   */
  constructor(private readonly scope: string = "global") {}

  private key(nonce: string): string {
    return `${this.scope}:${nonce}`;
  }

  /** Returns true if nonce was not seen before; records it. */
  consume(nonce: string): boolean {
    const k = this.key(nonce);
    if (this.seen.has(k)) return false;
    this.seen.add(k);
    return true;
  }

  assertFresh(nonce: string): void {
    if (!this.consume(nonce)) {
      throw new CryptoVerifyError(
        CRYPTO_ERROR.REPLAYED_NONCE,
        `Nonce already used: ${nonce}`
      );
    }
  }

  reset(): void {
    this.seen.clear();
  }
}

/** Extract nonce from unsigned payloads when present. */
export function extractNonce(unsigned: Record<string, unknown>): string | null {
  const n = unsigned.nonce;
  return typeof n === "string" && n.length > 0 ? n : null;
}

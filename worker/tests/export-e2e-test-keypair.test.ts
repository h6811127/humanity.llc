import { describe, expect, it } from "vitest";

import { encodeBase58 } from "../src/crypto/base58";
import { getTestKeypair } from "../src/crypto/ed25519";

/** Shared with Playwright hosted-tier specs — deterministic test seed only. */
export const HOSTED_E2E_TEST_PUBLIC_KEY_B58 = "AXBxsNjTx7KQXM5DJPFgKEFYZD6vt6TNDueNKrwyfPeT";

let cachedPrivateKeyB58: string | null = null;

export async function hostedE2eTestPrivateKeyB58() {
  if (!cachedPrivateKeyB58) {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    expect(publicKeyBase58).toBe(HOSTED_E2E_TEST_PUBLIC_KEY_B58);
    cachedPrivateKeyB58 = encodeBase58(privateKey);
  }
  return cachedPrivateKeyB58;
}

describe("hosted e2e test keypair", () => {
  it("exports deterministic fixture keys for Playwright", async () => {
    const privateKeyBase58 = await hostedE2eTestPrivateKeyB58();
    expect(privateKeyBase58.length).toBeGreaterThan(20);
  });
});

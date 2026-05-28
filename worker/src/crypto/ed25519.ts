import * as ed from "@noble/ed25519";

import { decodePublicKeyBase58, decodeSignatureBase58, encodeBase58 } from "./base58";

/** Deterministic test seed  -  NEVER use in production. */
export const TEST_SEED_PHRASE = "humanity-commons-test-seed-v1";

let testSeedPromise: Promise<Uint8Array> | null = null;

/** 32-byte seed for unit tests and fixture generation only. */
export async function getTestPrivateKeySeed(): Promise<Uint8Array> {
  if (!testSeedPromise) {
    testSeedPromise = (async () => {
      const { sha256 } = await import("@noble/hashes/sha256");
      return sha256(new TextEncoder().encode(TEST_SEED_PHRASE));
    })();
  }
  return testSeedPromise;
}

export async function getTestKeypair(): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  publicKeyBase58: string;
}> {
  const privateKey = await getTestPrivateKeySeed();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey,
    publicKey,
    publicKeyBase58: encodeBase58(publicKey),
  };
}

export async function signCanonicalBytes(
  message: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  return ed.signAsync(message, privateKey);
}

export async function verifyCanonicalBytes(
  message: Uint8Array,
  signatureBytes: Uint8Array,
  publicKeyBytes: Uint8Array
): Promise<boolean> {
  return ed.verifyAsync(signatureBytes, message, publicKeyBytes);
}

export async function verifyBase58Signature(
  message: Uint8Array,
  signatureBase58: string,
  publicKeyBase58: string
): Promise<boolean> {
  const sig = decodeSignatureBase58(signatureBase58);
  const pk = decodePublicKeyBase58(publicKeyBase58);
  return verifyCanonicalBytes(message, sig, pk);
}

import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  decryptOwnerPrivateKeyB58,
  encryptOwnerPrivateKeyB58,
  importAesGcmKey,
} from "../../site/js/device-custody-wrap-core.mjs";

describe("device-custody-wrap-core", () => {
  it("round-trips owner private key with AES-GCM", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await importAesGcmKey(raw);
    const ownerKey = "7nY8examplePrivateKeyBase58Value";
    const { iv, ciphertext } = await encryptOwnerPrivateKeyB58(aesKey, ownerKey);
    const decoded = await decryptOwnerPrivateKeyB58(aesKey, iv, ciphertext);
    expect(decoded).toBe(ownerKey);
  });

  it("encodes base64 for storage fields", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(bytesToBase64(bytes)).toBe(btoa(String.fromCharCode(1, 2, 3)));
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual([1, 2, 3]);
  });
});

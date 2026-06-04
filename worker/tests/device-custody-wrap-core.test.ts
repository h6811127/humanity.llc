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

  it("encodes Web Crypto encrypt ciphertext (ArrayBuffer) for wallet wrap", async () => {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await importAesGcmKey(raw);
    const ownerKey = "7nY8examplePrivateKeyBase58Value";
    const { iv, ciphertext } = await encryptOwnerPrivateKeyB58(aesKey, ownerKey);
    expect(ciphertext).toBeInstanceOf(ArrayBuffer);

    const stored = bytesToBase64(ciphertext);
    const decoded = await decryptOwnerPrivateKeyB58(
      aesKey,
      iv,
      base64ToBytes(stored)
    );
    expect(decoded).toBe(ownerKey);
  });

  it("encodes ArrayBuffer and ArrayBufferView without copying semantics drift", () => {
    const buf = new Uint8Array([10, 20, 30]).buffer;
    expect(bytesToBase64(buf)).toBe(bytesToBase64(new Uint8Array([10, 20, 30])));
    const view = new Uint8Array(buf).subarray(1, 2);
    expect(bytesToBase64(view)).toBe(bytesToBase64(new Uint8Array([20])));
  });
});

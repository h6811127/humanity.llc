import { describe, expect, it } from "vitest";

import { encodeBase58 } from "../src/crypto/base58";
import { getTestKeypair } from "../src/crypto/ed25519";

// Browser module  -  tested in Node via Web Crypto (Node 20+).
import {
  BACKUP_TYPE,
  BACKUP_VERSION,
  createEncryptedBackup,
  decryptBackup,
  normalizePassphrase,
} from "../src/crypto/key-backup";

describe("key backup (M5.5.1)", () => {
  it("round-trips encrypt/decrypt", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const privateKeyBase58 = encodeBase58(privateKey);
    const profileId = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
    const passphrase = "correct-horse-battery-staple";

    const backup = await createEncryptedBackup({
      profileId,
      publicKeyBase58,
      privateKeyBase58,
      passphrase,
    });

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.profile_id).toBe(profileId);

    const out = await decryptBackup(backup, passphrase);
    expect(out.privateKeyBase58).toBe(privateKeyBase58);
    expect(out.publicKeyBase58).toBe(publicKeyBase58);
  });

  it("rejects short passphrase", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    await expect(
      createEncryptedBackup({
        profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        publicKeyBase58,
        privateKeyBase58: encodeBase58(privateKey),
        passphrase: "short",
      })
    ).rejects.toThrow(/12/);
  });

  it("rejects wrong passphrase", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const backup = await createEncryptedBackup({
      profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      publicKeyBase58,
      privateKeyBase58: encodeBase58(privateKey),
      passphrase: "correct-horse-battery-staple",
    });
    await expect(decryptBackup(backup, "wrong-passphrase-here")).rejects.toThrow(
      /Wrong passphrase/
    );
  });

  it("normalizes passphrase with trim + NFKC before length and crypto", async () => {
    expect(normalizePassphrase("  padded-passphrase  ")).toBe("padded-passphrase");
    // U+FB01 LATIN SMALL LIGATURE FI → "fi" under NFKC
    expect(normalizePassphrase("passphrase-\uFB01ne")).toBe("passphrase-fine");

    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const privateKeyBase58 = encodeBase58(privateKey);
    const backup = await createEncryptedBackup({
      profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      publicKeyBase58,
      privateKeyBase58,
      passphrase: "  correct-horse-battery-staple  ",
    });
    const out = await decryptBackup(backup, "correct-horse-battery-staple");
    expect(out.privateKeyBase58).toBe(privateKeyBase58);
  });

  it("rejects unsupported backup version and wrong type before decrypt", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const backup = await createEncryptedBackup({
      profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      publicKeyBase58,
      privateKeyBase58: encodeBase58(privateKey),
      passphrase: "correct-horse-battery-staple",
    });

    await expect(
      decryptBackup({ ...backup, version: "9.9" }, "correct-horse-battery-staple")
    ).rejects.toThrow(/Unsupported backup version: 9\.9/);

    await expect(
      decryptBackup(
        { ...backup, type: "not_a_backup", version: BACKUP_VERSION },
        "correct-horse-battery-staple"
      )
    ).rejects.toThrow(/Not a Humanity Card key backup/);

    expect(BACKUP_TYPE).toBe("humanity_card_key_backup");
  });
});

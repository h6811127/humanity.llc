import { describe, expect, it, vi } from "vitest";

import {
  assertRecoveryKeyMatchesCard,
  mergeRecoveryIntoWallet,
  parseProfileIdFromCardRef,
  recoveryImportLabel,
} from "../../site/js/device-hub-import-recovery-core.mjs";

const PROFILE_ID = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("parseProfileIdFromCardRef", () => {
  it("accepts raw profile id, scan URL, and created URL", () => {
    expect(parseProfileIdFromCardRef(PROFILE_ID)).toBe(PROFILE_ID);
    expect(parseProfileIdFromCardRef(`https://humanity.llc/c/${PROFILE_ID}`)).toBe(PROFILE_ID);
    expect(
      parseProfileIdFromCardRef(`https://humanity.llc/created/?profile_id=${PROFILE_ID}`)
    ).toBe(PROFILE_ID);
  });

  it("rejects empty or unparseable input", () => {
    expect(parseProfileIdFromCardRef("")).toBeNull();
    expect(parseProfileIdFromCardRef("not-a-card")).toBeNull();
    expect(parseProfileIdFromCardRef("https://example.com/")).toBeNull();
  });
});

describe("assertRecoveryKeyMatchesCard", () => {
  it("returns derived public key when recovery matches card", async () => {
    const derive = vi.fn(async () => "pubRecovery");
    await expect(
      assertRecoveryKeyMatchesCard("privRecovery", "pubRecovery", derive)
    ).resolves.toBe("pubRecovery");
  });

  it("rejects mismatch and missing card recovery key", async () => {
    await expect(
      assertRecoveryKeyMatchesCard("priv", "other", async () => "pub")
    ).rejects.toThrow(/does not match/i);
    await expect(
      assertRecoveryKeyMatchesCard("priv", "", async () => "pub")
    ).rejects.toThrow(/no recovery key/i);
  });
});

describe("recoveryImportLabel", () => {
  it("prefers handle over profile id slice placeholder", () => {
    expect(
      recoveryImportLabel({
        profileId: PROFILE_ID,
        handle: "steward",
        existingLabel: PROFILE_ID.slice(0, 12),
      })
    ).toBe("@steward");
  });
});

describe("mergeRecoveryIntoWallet", () => {
  it("inserts a new wallet row with recovery material", () => {
    const result = mergeRecoveryIntoWallet([], {
      profileId: PROFILE_ID,
      recoveryPublicKeyB58: "pubR",
      recoveryPrivateKeyB58: "privR",
      ownerPublicKeyB58: "pubO",
      scanUrl: `https://humanity.llc/c/${PROFILE_ID}?q=qr_test`,
      qrId: "qr_test",
      handle: "steward",
    });
    expect(result.isNew).toBe(true);
    expect(result.entry.recovery_private_key_b58).toBe("privR");
    expect(result.entry.recovery_key_acknowledged).toBe(true);
    expect(result.entry.label).toBe("@steward");
    expect(result.entries).toHaveLength(1);
  });

  it("updates an existing row without dropping owner keys", () => {
    const existing = {
      profile_id: PROFILE_ID,
      owner_private_key_b58: "ownerPriv",
      label: "mine",
    };
    const result = mergeRecoveryIntoWallet([existing], {
      profileId: PROFILE_ID,
      recoveryPublicKeyB58: "pubR",
      recoveryPrivateKeyB58: "privR",
      scanUrl: `https://humanity.llc/c/${PROFILE_ID}`,
    });
    expect(result.isNew).toBe(false);
    expect(result.entry.owner_private_key_b58).toBe("ownerPriv");
    expect(result.entry.recovery_private_key_b58).toBe("privR");
  });

  it("strips stale device_unlock wrap when merging recovery on new device (C4 · K11)", () => {
    const existing = {
      profile_id: PROFILE_ID,
      custody_mode: "device_unlock",
      wrapped_owner_key: {
        version: 1,
        credential_id: "old-cred",
        prf_salt: "s",
        iv: "i",
        ciphertext: "c",
      },
    };
    const result = mergeRecoveryIntoWallet([existing], {
      profileId: PROFILE_ID,
      recoveryPublicKeyB58: "pubR",
      recoveryPrivateKeyB58: "privR",
      scanUrl: `https://humanity.llc/c/${PROFILE_ID}`,
    });
    expect(result.entry.wrapped_owner_key).toBeUndefined();
    expect(result.entry.device_unlock_reenroll_pending).toBe(true);
    expect(result.entry.recovery_private_key_b58).toBe("privR");
  });
});

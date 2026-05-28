import { describe, expect, it } from "vitest";

import { mergeBackupIntoWallet } from "../../site/js/device-hub-import-core.mjs";

const PROFILE = "cuAPt5nFYr8VCCWgPbAAupBS";
const IMPORTED_AT = "2026-05-16T17:00:00.000Z";

describe("mergeBackupIntoWallet", () => {
  it("updates an existing wallet row with imported keys", () => {
    const entries = [
      {
        profile_id: PROFILE,
        label: "Studio",
        scan_url: `https://humanity.llc/c/${PROFILE}?q=qr_existing0001`,
        owner_public_key_b58: "oldPub",
      },
    ];
    const { entries: next, entry, isNew } = mergeBackupIntoWallet(
      entries,
      {
        profileId: PROFILE,
        publicKeyBase58: "newPub",
        privateKeyBase58: "newPriv",
      },
      `https://humanity.llc/c/${PROFILE}`,
      IMPORTED_AT
    );
    expect(isNew).toBe(false);
    expect(next).toHaveLength(1);
    expect(entry.owner_public_key_b58).toBe("newPub");
    expect(entry.owner_private_key_b58).toBe("newPriv");
    expect(entry.key_imported_at).toBe(IMPORTED_AT);
    expect(entry.scan_url).toContain(PROFILE);
  });

  it("prepends a new wallet row when profile was not saved", () => {
    const { entries, entry, isNew } = mergeBackupIntoWallet(
      [],
      {
        profileId: PROFILE,
        publicKeyBase58: "newPub",
        privateKeyBase58: "newPriv",
      },
      `https://humanity.llc/c/${PROFILE}`,
      IMPORTED_AT
    );
    expect(isNew).toBe(true);
    expect(entries).toHaveLength(1);
    expect(entry.profile_id).toBe(PROFILE);
    expect(entry.owner_private_key_b58).toBe("newPriv");
  });
});

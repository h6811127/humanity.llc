import { describe, expect, it } from "vitest";

import {
  loadRootSessionRecordForMerch,
  merchBackupNudgeCopy,
  shouldShowMerchBackupNudge,
} from "../../site/js/merch-backup-nudge-core.mjs";

describe("merch-backup-nudge-core", () => {
  it("shows nudge when signing session lacks backup seatbelt", () => {
    expect(
      shouldShowMerchBackupNudge({
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        owner_private_key_b58: "abc",
      })
    ).toBe(true);
    expect(
      shouldShowMerchBackupNudge({
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        recovery_key_acknowledged: true,
      })
    ).toBe(false);
  });

  it("returns phase-specific copy", () => {
    expect(merchBackupNudgeCopy("pre_checkout").title).toContain("before");
    expect(merchBackupNudgeCopy("post_checkout").title).toContain("now");
  });

  it("loads hc_created session before wallet", () => {
    const storage = {
      sessionStorage: {
        getItem(key: string) {
          if (key !== "hc_created") return null;
          return JSON.stringify({
            profile_id: "fromCreated",
            owner_private_key_b58: "k",
          });
        },
      },
      localStorage: {
        getItem(key: string) {
          if (key !== "hc_wallet") return null;
          return JSON.stringify([
            { profile_id: "fromWallet", owner_private_key_b58: "k" },
          ]);
        },
      },
    };
    expect(loadRootSessionRecordForMerch(storage)?.profile_id).toBe("fromCreated");
  });
});

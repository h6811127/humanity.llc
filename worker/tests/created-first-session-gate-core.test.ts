import { describe, expect, it } from "vitest";

import {
  firstSessionSetupRequired,
  mergeOwnershipSeatbeltFields,
  ownershipBackupSeatbeltSatisfied,
} from "../../site/js/created-first-session-gate-core.mjs";

describe("firstSessionSetupRequired (P0-4)", () => {
  it("requires setup for fresh create even when wallet saved", () => {
    expect(
      firstSessionSetupRequired({
        freshParam: true,
        walletSaved: true,
        setupDone: true,
        seatbeltSatisfied: true,
      })
    ).toBe(true);
  });

  it("requires setup when keys not saved on device", () => {
    expect(
      firstSessionSetupRequired({
        freshParam: false,
        walletSaved: false,
        setupDone: false,
        seatbeltSatisfied: false,
      })
    ).toBe(true);
  });

  it("skips setup for returning steward when wallet saved (not fresh)", () => {
    expect(
      firstSessionSetupRequired({
        freshParam: false,
        walletSaved: true,
        setupDone: false,
        seatbeltSatisfied: false,
      })
    ).toBe(false);
    expect(
      firstSessionSetupRequired({
        freshParam: false,
        walletSaved: true,
        setupDone: true,
        seatbeltSatisfied: false,
      })
    ).toBe(false);
  });
});

describe("ownershipBackupSeatbeltSatisfied", () => {
  it("accepts session or wallet entry markers", () => {
    expect(
      ownershipBackupSeatbeltSatisfied(
        {},
        { recovery_key_acknowledged: true }
      )
    ).toBe(true);
    expect(
      ownershipBackupSeatbeltSatisfied(
        { key_backup_exported_at: "2026-05-28T12:00:00.000Z" },
        null
      )
    ).toBe(true);
    expect(ownershipBackupSeatbeltSatisfied({}, {})).toBe(false);
  });
});

describe("mergeOwnershipSeatbeltFields", () => {
  it("copies seatbelt markers from session into wallet entry", () => {
    const entry = mergeOwnershipSeatbeltFields(
      { profile_id: "p1" },
      {
        recovery_key_acknowledged: true,
        key_backup_exported_at: "2026-05-28T12:00:00.000Z",
        key_imported_at: "2026-05-28T13:00:00.000Z",
      }
    );
    expect(entry.recovery_key_acknowledged).toBe(true);
    expect(entry.key_backup_exported_at).toBe("2026-05-28T12:00:00.000Z");
    expect(entry.key_imported_at).toBe("2026-05-28T13:00:00.000Z");
  });
});

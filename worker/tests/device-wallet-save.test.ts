import { describe, expect, it } from "vitest";

import { verificationRecordFromLabelState } from "../../site/js/device-wallet-network-core.mjs";
import { mergeWalletEntryFromSession } from "../../site/js/device-wallet.mjs";

describe("verificationRecordFromLabelState", () => {
  it("maps Steward label to steward state for the status dot", () => {
    expect(
      verificationRecordFromLabelState("Steward", "verified_human")
    ).toEqual({ label: "Steward", state: "steward" });
  });
});

describe("mergeWalletEntryFromSession", () => {
  it("updates verification when session becomes steward", () => {
    const existing = {
      profile_id: "p1",
      label: "Card",
      owner_private_key_b58: "priv",
      verification: { state: "verified_human", label: "Vouched Human" },
    };
    const session = {
      profile_id: "p1",
      owner_private_key_b58: "priv",
      verification: { state: "steward", label: "Steward" },
    };
    const merged = mergeWalletEntryFromSession(existing, session);
    expect(merged.verification).toEqual({ state: "steward", label: "Steward" });
  });

  it("keeps existing verification when session omits it", () => {
    const existing = {
      profile_id: "p1",
      label: "Card",
      owner_private_key_b58: "priv",
      verification: { state: "steward", label: "Steward" },
    };
    const session = {
      profile_id: "p1",
      owner_private_key_b58: "priv",
    };
    const merged = mergeWalletEntryFromSession(existing, session);
    expect(merged.verification).toEqual({ state: "steward", label: "Steward" });
  });
});

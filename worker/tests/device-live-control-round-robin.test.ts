import { describe, expect, it } from "vitest";

import {
  applySingleCardPollHealth,
  liveControlPollEntryKey,
  pendingItemsFromPollSlots,
  pruneLiveControlPollSlots,
  updateLiveControlPollSlot,
} from "../../site/js/device-live-control-inbox-core.mjs";

describe("liveControlPollEntryKey", () => {
  it("uses profile_id and qr_id", () => {
    expect(
      liveControlPollEntryKey({
        profile_id: "prof1",
        qr_id: "qr_E2eWakketTest9",
      })
    ).toBe("prof1:qr_E2eWakketTest9");
    expect(liveControlPollEntryKey({ profile_id: "prof1" })).toBe("");
  });
});

describe("round-robin poll slots", () => {
  const entryA = {
    profile_id: "profA",
    qr_id: "qr_E2eWakketTest9",
    label: "A",
  };
  const entryB = {
    profile_id: "profB",
    qr_id: "qr_E2eWakketTest8",
    label: "B",
  };

  it("accumulates pending across ticks and clears on none", () => {
    const slots = new Map();
    const pendingItem = {
      entry: entryA,
      challenge_id: "ch1",
      return_url: null,
      owner_url: null,
      expires_at: "2099-01-01T00:00:00.000Z",
    };
    updateLiveControlPollSlot(slots, entryA, {
      kind: "pending",
      item: pendingItem,
    });
    expect(pendingItemsFromPollSlots([entryA, entryB], slots)).toEqual([
      pendingItem,
    ]);
    updateLiveControlPollSlot(slots, entryA, { kind: "none" });
    expect(pendingItemsFromPollSlots([entryA, entryB], slots)).toEqual([]);
  });

  it("prunes removed wallet rows", () => {
    const slots = new Map();
    updateLiveControlPollSlot(slots, entryA, {
      kind: "pending",
      item: {
        entry: entryA,
        challenge_id: "ch1",
        return_url: null,
        owner_url: null,
        expires_at: "",
      },
    });
    pruneLiveControlPollSlots(slots, [entryB]);
    expect(slots.size).toBe(0);
  });
});

describe("applySingleCardPollHealth", () => {
  it("degrades on unreachable but not on rate limit", () => {
    expect(applySingleCardPollHealth("ok", "unreachable")).toBe("degraded");
    expect(applySingleCardPollHealth("degraded", "unreachable")).toBe("degraded");
    expect(applySingleCardPollHealth("ok", "rate_limited")).toBe("ok");
    expect(applySingleCardPollHealth("degraded", "none")).toBe("ok");
  });
});

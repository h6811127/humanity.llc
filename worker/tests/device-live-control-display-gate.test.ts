import { describe, expect, it } from "vitest";

import {
  applyLiveControlPollConfirmation,
  entriesForHubExpandLiveProofVerification,
  filterConfirmedLiveControlPending,
  isLiveControlPendingExpired,
} from "../../site/js/device-live-control-inbox-core.mjs";
import { REFERENCE_FREE_POLICY } from "../../site/js/device-steward-entitlements-core.mjs";

const entry = {
  profile_id: "profA",
  qr_id: "qr_E2eWakketTest9",
};

const pendingItem = {
  entry,
  challenge_id: "ch_confirmed",
  return_url: null,
  owner_url: null,
  expires_at: "2099-01-01T00:00:00.000Z",
};

describe("isLiveControlPendingExpired", () => {
  it("returns false for future expiry", () => {
    expect(isLiveControlPendingExpired(pendingItem, Date.parse("2098-01-01"))).toBe(
      false
    );
  });

  it("returns true for past expiry", () => {
    expect(isLiveControlPendingExpired(pendingItem, Date.parse("2099-06-01"))).toBe(
      true
    );
  });
});

describe("filterConfirmedLiveControlPending", () => {
  it("returns only confirmed, non-expired rows", () => {
    const confirmed = new Set(["ch_confirmed"]);
    const items = [
      pendingItem,
      {
        ...pendingItem,
        challenge_id: "ch_unconfirmed",
      },
      {
        ...pendingItem,
        challenge_id: "ch_expired",
        expires_at: "2020-01-01T00:00:00.000Z",
      },
    ];
    expect(
      filterConfirmedLiveControlPending(items, confirmed, Date.parse("2098-01-01"))
    ).toEqual([pendingItem]);
  });
});

describe("applyLiveControlPollConfirmation", () => {
  it("confirms on pending and revokes on none", () => {
    const confirmed = new Set<string>();
    const slots = new Map();

    applyLiveControlPollConfirmation(confirmed, entry, slots, {
      kind: "pending",
      item: pendingItem,
    });
    expect(confirmed.has("ch_confirmed")).toBe(true);

    slots.set("profA:qr_E2eWakketTest9", pendingItem);
    applyLiveControlPollConfirmation(confirmed, entry, slots, { kind: "none" });
    expect(confirmed.has("ch_confirmed")).toBe(false);
  });

  it("replaces confirmation when challenge id changes", () => {
    const confirmed = new Set<string>();
    const slots = new Map([
      [
        "profA:qr_E2eWakketTest9",
        { ...pendingItem, challenge_id: "ch_old" },
      ],
    ]);

    applyLiveControlPollConfirmation(confirmed, entry, slots, {
      kind: "pending",
      item: { ...pendingItem, challenge_id: "ch_new" },
    });

    expect(confirmed.has("ch_old")).toBe(false);
    expect(confirmed.has("ch_new")).toBe(true);
  });
});

describe("entriesForHubExpandLiveProofVerification", () => {
  const entryA = { profile_id: "profA", qr_id: "qr_a" };
  const entryB = { profile_id: "profB", qr_id: "qr_b" };
  const cachedPending = [
    {
      entry: entryB,
      challenge_id: "ch_b",
      return_url: null,
      owner_url: null,
      expires_at: "",
    },
  ];

  it("verifies all pollable rows in a small wallet", () => {
    expect(
      entriesForHubExpandLiveProofVerification(
        [entryA, entryB],
        [],
        null,
        REFERENCE_FREE_POLICY
      )
    ).toEqual([entryA, entryB]);
  });

  it("verifies active and cached pending rows in a large wallet", () => {
    const largePolicy = {
      ...REFERENCE_FREE_POLICY,
      walletLargeThreshold: 2,
    };
    expect(
      entriesForHubExpandLiveProofVerification(
        [entryA, entryB],
        cachedPending,
        "profA",
        largePolicy
      )
    ).toEqual([entryA, entryB]);
  });
});

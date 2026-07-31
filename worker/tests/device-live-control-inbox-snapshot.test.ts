import { describe, expect, it } from "vitest";

import {
  applyLiveControlSnapshotConfirmation,
  filterConfirmedLiveControlPending,
} from "../../site/js/device-live-control-inbox-core.mjs";

const pendingItem = {
  entry: { profile_id: "prof_live_proof", qr_id: "qr_live_proof" },
  challenge_id: "lc_confirmed_by_leader",
  return_url: null,
  owner_url: null,
  expires_at: "2099-01-01T00:00:00.000Z",
};

describe("applyLiveControlInboxSnapshot", () => {
  it("surfaces leader-confirmed pending rows on follower tabs", () => {
    const confirmed = new Set<string>();

    applyLiveControlSnapshotConfirmation(confirmed, [pendingItem]);
    expect(filterConfirmedLiveControlPending([pendingItem], confirmed)).toEqual([
      pendingItem,
    ]);

    applyLiveControlSnapshotConfirmation(confirmed, []);
    expect(filterConfirmedLiveControlPending([pendingItem], confirmed)).toEqual([]);
  });
});

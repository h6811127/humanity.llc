import { describe, expect, it } from "vitest";

import {
  presenceShowStreakAfterRead,
  shouldSkipCrossTabOverlayViewTransition,
  stablePresenceInboxEntries,
} from "../../site/js/device-presence-inbox-stability-core.mjs";

describe("presenceShowStreakAfterRead", () => {
  it("resets when raw count is zero", () => {
    expect(presenceShowStreakAfterRead(3, 0)).toEqual({ streak: 0, show: false });
  });

  it("requires two positive reads before show", () => {
    expect(presenceShowStreakAfterRead(0, 1)).toEqual({ streak: 1, show: false });
    expect(presenceShowStreakAfterRead(1, 1)).toEqual({ streak: 2, show: true });
  });
});

describe("stablePresenceInboxEntries", () => {
  const shouldShow = (n, tabNotice) => tabNotice === 0 && n > 0;
  const raw = [{ profile_id: "p1", tabId: "t1" }];

  it("returns empty until streak threshold", () => {
    const first = stablePresenceInboxEntries(raw, 0, shouldShow, 0);
    expect(first.entries).toHaveLength(0);
    const second = stablePresenceInboxEntries(raw, 0, shouldShow, first.streak);
    expect(second.entries).toHaveLength(1);
  });

  it("clears immediately when gate fails", () => {
    const gated = stablePresenceInboxEntries(raw, 1, shouldShow, 2);
    expect(gated.entries).toHaveLength(0);
    expect(gated.streak).toBe(0);
  });
});

describe("shouldSkipCrossTabOverlayViewTransition", () => {
  it("skips when only cross-tab overlay toggles", () => {
    expect(
      shouldSkipCrossTabOverlayViewTransition(
        { network: "ok", device: "keys", overlay: "none" },
        { network: "ok", device: "keys", overlay: "cross_tab_keys" }
      )
    ).toBe(true);
  });

  it("does not skip when device state changes", () => {
    expect(
      shouldSkipCrossTabOverlayViewTransition(
        { network: "ok", device: "none", overlay: "none" },
        { network: "ok", device: "keys", overlay: "cross_tab_keys" }
      )
    ).toBe(false);
  });
});

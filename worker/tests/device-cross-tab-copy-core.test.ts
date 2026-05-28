import { describe, expect, it } from "vitest";

import {
  crossTabAggregateSubtitle,
  crossTabAggregateTitle,
  crossTabPresenceLabel,
} from "../../site/js/device-cross-tab-copy-core.mjs";

describe("device-cross-tab-copy-core", () => {
  it("crossTabPresenceLabel prefers label, then handle, then profile id", () => {
    expect(crossTabPresenceLabel({ label: "Studio keys" })).toBe("Studio keys");
    expect(crossTabPresenceLabel({ handle: "alice", profile_id: "abc" })).toBe("@alice");
    expect(crossTabPresenceLabel({ profile_id: "7Xk9mP2nQ4rT" })).toBe("7Xk9mP2nQ4rT…");
    expect(crossTabPresenceLabel({})).toBe("Other tab");
  });

  it("crossTabAggregateTitle uses open-in-tab wording", () => {
    expect(crossTabAggregateTitle(1)).toBe("Keys open in 1 other tab");
    expect(crossTabAggregateTitle(2)).toBe("Keys open in 2 other tabs");
  });

  it("crossTabAggregateSubtitle joins stable per-tab labels", () => {
    expect(
      crossTabAggregateSubtitle([
        { handle: "alice" },
        { label: "Work tab" },
      ])
    ).toBe("@alice · Work tab");
    const many = Array.from({ length: 4 }, (_, i) => ({ handle: `u${i}` }));
    expect(crossTabAggregateSubtitle(many)).toBe("@u0 · @u1 · @u2 (+1 more)");
  });
});

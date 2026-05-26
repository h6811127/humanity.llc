import { describe, expect, it } from "vitest";

import {
  buildInboxItems,
  buildInboxSheetRows,
  inboxBadgeAriaLabel,
  inboxBadgeCountText,
  inboxCountFromItems,
  inboxOverlayCountsFromItems,
  topInboxKind,
} from "../../site/js/device-inbox-core.mjs";

describe("buildInboxItems", () => {
  it("returns live proof and cross-tab in priority order", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 2,
      crossTabEntries: [
        { profile_id: "abc", tabId: "t1", handle: "alice" },
        { profile_id: "def", tabId: "t2" },
      ],
    });
    expect(items.map((i) => i.kind)).toEqual(["live_proof", "cross_tab_keys"]);
    expect(items[0].count).toBe(2);
    expect(items[0].title).toBe("2 live proof waiting");
    expect(items[1].count).toBe(2);
    expect(items[1].subtitle).toContain("@alice");
    expect(items[1].subtitle).toContain("+1 more");
  });

  it("includes tab notice item when keys are unsaved in this tab", () => {
    const items = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 0,
      crossTabEntries: [],
      tabSessionLabel: "@bob",
    });
    expect(items.map((i) => i.kind)).toEqual(["tab_keys_unsaved"]);
    expect(items[0].subtitle).toBe("@bob");
    expect(items[0].title).toContain("save");
  });

  it("suppresses cross-tab when tab keys notice is active", () => {
    const items = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 0,
      crossTabEntries: [{ profile_id: "abc", tabId: "t1" }],
    });
    expect(items.map((i) => i.kind)).toEqual(["tab_keys_unsaved"]);
  });

  it("returns empty when nothing actionable", () => {
    expect(
      buildInboxItems({
        tabNoticeCount: 0,
        liveProofCount: 0,
        crossTabEntries: [],
      })
    ).toEqual([]);
  });
});

describe("inboxCountFromItems", () => {
  it("sums item counts for badge total", () => {
    const items = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 3,
      crossTabEntries: [],
    });
    expect(inboxCountFromItems(items)).toBe(4);
  });
});

describe("topInboxKind", () => {
  it("prioritizes live proof over cross-tab", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      crossTabEntries: [{ profile_id: "x", tabId: "t" }],
    });
    expect(topInboxKind(items)).toBe("live_proof");
  });

  it("returns cross_tab_keys when only cross-tab present", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [{ profile_id: "x", tabId: "t" }],
    });
    expect(topInboxKind(items)).toBe("cross_tab_keys");
  });
});

describe("inboxOverlayCountsFromItems", () => {
  it("aligns with dotOverlayFromCounts inputs", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 2,
      crossTabEntries: [{ profile_id: "x", tabId: "t" }],
    });
    expect(inboxOverlayCountsFromItems(items)).toEqual({
      liveProofPending: 2,
      crossTabNotice: 1,
    });
  });
});

describe("inboxBadgeAriaLabel", () => {
  it("describes kinds in plain language", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 2,
      crossTabEntries: [{ profile_id: "x", tabId: "t" }],
    });
    expect(inboxBadgeAriaLabel(items)).toBe(
      "Needs attention: 2 live proofs, keys in another tab"
    );
  });

  it("returns Inbox when empty", () => {
    expect(inboxBadgeAriaLabel([])).toBe("Inbox");
  });
});

describe("inboxBadgeCountText", () => {
  it("caps display at 9+", () => {
    expect(inboxBadgeCountText(10)).toBe("9+");
    expect(inboxBadgeCountText(3)).toBe("3");
  });
});

describe("buildInboxSheetRows", () => {
  it("expands live proof into one row per pending challenge", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 2,
      crossTabEntries: [],
    });
    const rows = buildInboxSheetRows(items, {
      liveProofPending: [
        {
          challenge_id: "c1",
          entry: { label: "Card A", profile_id: "p1" },
          expires_at: "2026-01-01T00:00:00Z",
        },
        {
          challenge_id: "c2",
          entry: { handle: "bob", profile_id: "p2" },
        },
      ],
      formatProofExpiry: () => "5m left",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Card A");
    expect(rows[0].subtitle).toContain("5m left");
    expect(rows[1].title).toBe("@bob");
  });

  it("lists each cross-tab entry as its own row", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [
        { profile_id: "a", tabId: "t1", handle: "one" },
        { profile_id: "b", tabId: "t2", label: "Two" },
      ],
    });
    const rows = buildInboxSheetRows(items, {
      crossTabEntries: [
        { profile_id: "a", tabId: "t1", handle: "one" },
        { profile_id: "b", tabId: "t2", label: "Two" },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].subtitle).toBe("@one");
    expect(rows[1].subtitle).toBe("Two");
  });
});

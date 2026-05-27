import { describe, expect, it } from "vitest";

import {
  buildHubKeysCustodyPanel,
  labelForHubKeysCustodyEntry,
} from "../../site/js/device-hub-keys-custody-core.mjs";

describe("buildHubKeysCustodyPanel", () => {
  it("shows one row per cross-tab entry instead of aggregate", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      crossTabEntries: [
        { profile_id: "abc", tabId: "t1", handle: "alice" },
        { profile_id: "def", tabId: "t2", label: "Demo card" },
      ],
    });
    expect(state.rows.filter((r) => r.kind === "cross_tab")).toHaveLength(2);
    expect(state.rows[0].subtitle).toBe("@alice");
    expect(state.rows[1].subtitle).toBe("Demo card");
    expect(state.visible).toBe(true);
    expect(state.showEducation).toBe(false);
  });

  it("shows unsaved this-tab row when tab notice is active", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 1,
      hasActiveKeys: true,
      tabSessionLabel: "@bob",
      crossTabEntries: [{ profile_id: "abc", tabId: "t1" }],
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["this_tab_unsaved"]);
    expect(state.rows[0].subtitle).toContain("@bob");
  });

  it("shows active this-tab row when keys loaded and saved", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      hasActiveKeys: true,
      tabSessionLabel: "@steward",
    });
    expect(state.rows).toEqual([
      {
        kind: "this_tab_active",
        title: "Keys active in this tab",
        subtitle: "@steward",
      },
    ]);
  });

  it("shows orphan rows per tab and suppresses cross-tab when tab unsaved", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 1,
      hasActiveKeys: true,
      orphanRemovedEntries: [
        { profile_id: "old1", tabId: "t1", label: "Removed A" },
        { profile_id: "old2", tabId: "t2", label: "Removed B" },
      ],
      crossTabEntries: [{ profile_id: "x", tabId: "t3" }],
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["this_tab_unsaved"]);
  });

  it("shows education when idle and not dismissed", () => {
    const state = buildHubKeysCustodyPanel({
      educationDismissed: false,
    });
    expect(state.rows).toEqual([]);
    expect(state.showEducation).toBe(true);
    expect(state.visible).toBe(true);
  });

  it("hides panel when nothing to show", () => {
    expect(
      buildHubKeysCustodyPanel({
        educationDismissed: true,
      }).visible
    ).toBe(false);
  });
});

describe("labelForHubKeysCustodyEntry", () => {
  it("prefers label, then handle, then profile prefix", () => {
    expect(labelForHubKeysCustodyEntry({ profile_id: "abc", tabId: "t", label: "My card" })).toBe(
      "My card"
    );
    expect(labelForHubKeysCustodyEntry({ profile_id: "abc", tabId: "t", handle: "alice" })).toBe(
      "@alice"
    );
    expect(labelForHubKeysCustodyEntry({ profile_id: "abcdefghijklmnop", tabId: "t" })).toBe(
      "abcdefghijkl…"
    );
  });
});

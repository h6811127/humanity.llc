import { describe, expect, it } from "vitest";

import {
  buildInboxItems,
  inboxItemsIncludeKind,
} from "../../site/js/device-inbox-core.mjs";

describe("inboxItemsIncludeKind", () => {
  it("reflects buildInboxItems kinds", () => {
    const items = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 1,
      crossTabEntries: [{ profile_id: "a", tabId: "t1" }],
    });
    expect(inboxItemsIncludeKind(items, "live_proof")).toBe(true);
    expect(inboxItemsIncludeKind(items, "tab_keys_unsaved")).toBe(true);
    expect(inboxItemsIncludeKind(items, "cross_tab_keys")).toBe(false);
  });

  it("is false when inbox has no matching kind", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [],
    });
    expect(inboxItemsIncludeKind(items, "live_proof")).toBe(false);
    expect(inboxItemsIncludeKind(items, "card_disabled_since_visit")).toBe(false);
  });

  it("includes cross_tab_keys only when tab keys notice is not active", () => {
    const withCrossTab = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [{ profile_id: "a", tabId: "t1" }],
    });
    expect(inboxItemsIncludeKind(withCrossTab, "cross_tab_keys")).toBe(true);

    const tabKeysWins = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 0,
      crossTabEntries: [{ profile_id: "a", tabId: "t1" }],
    });
    expect(inboxItemsIncludeKind(tabKeysWins, "cross_tab_keys")).toBe(false);
  });
});

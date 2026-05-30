import { describe, expect, it } from "vitest";

import {
  HUB_SEARCH_NO_SAVED_MATCHES,
  shouldClearHubSearchOnStrangerTransition,
  shouldHubSearchApplyVisibility,
  shouldShowSavedSearchEmptyState,
} from "../../site/js/device-hub-search-core.mjs";

describe("shouldHubSearchApplyVisibility (since-visit item 10)", () => {
  it("skips hub-card-status-alert elements", () => {
    const alert = {
      classList: {
        contains: (name: string) => name === "hub-card-status-alert",
      },
    };
    expect(shouldHubSearchApplyVisibility(alert)).toBe(false);
  });

  it("applies visibility to normal searchable rows", () => {
    const row = {
      classList: {
        contains: () => false,
      },
    };
    expect(shouldHubSearchApplyVisibility(row)).toBe(true);
  });

  it("applies visibility when classList is missing", () => {
    expect(shouldHubSearchApplyVisibility({})).toBe(true);
  });
});

describe("shouldClearHubSearchOnStrangerTransition (RC-14)", () => {
  it("clears only when stranger state flips", () => {
    expect(shouldClearHubSearchOnStrangerTransition(null, true)).toBe(false);
    expect(shouldClearHubSearchOnStrangerTransition(false, false)).toBe(false);
    expect(shouldClearHubSearchOnStrangerTransition(true, true)).toBe(false);
    expect(shouldClearHubSearchOnStrangerTransition(true, false)).toBe(true);
    expect(shouldClearHubSearchOnStrangerTransition(false, true)).toBe(true);
  });
});

describe("shouldShowSavedSearchEmptyState (RC-14)", () => {
  it("shows when wallet has rows but filter matches none", () => {
    expect(
      shouldShowSavedSearchEmptyState({
        walletCount: 2,
        query: "missing",
        savedGroupHasItems: true,
        savedGroupAnyVisible: false,
      })
    ).toBe(true);
  });

  it("hides when query empty, wallet empty, or saved rows visible", () => {
    expect(
      shouldShowSavedSearchEmptyState({
        walletCount: 2,
        query: "",
        savedGroupHasItems: true,
        savedGroupAnyVisible: false,
      })
    ).toBe(false);
    expect(
      shouldShowSavedSearchEmptyState({
        walletCount: 0,
        query: "x",
        savedGroupHasItems: true,
        savedGroupAnyVisible: false,
      })
    ).toBe(false);
    expect(
      shouldShowSavedSearchEmptyState({
        walletCount: 1,
        query: "demo",
        savedGroupHasItems: true,
        savedGroupAnyVisible: true,
      })
    ).toBe(false);
  });

  it("exports explicit no-match copy", () => {
    expect(HUB_SEARCH_NO_SAVED_MATCHES).toMatch(/match your search/i);
  });
});

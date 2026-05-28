import { describe, expect, it } from "vitest";

import {
  computeCrossTabNotificationState,
  crossTabPresenceFingerprint,
  stableCrossTabLaneAfterRead,
  CROSS_TAB_MIN_SHOW_STREAK,
} from "../../site/js/device-cross-tab-state-core.mjs";

const shouldShow = (n: number, tabNotice: number) => tabNotice === 0 && n > 0;

const entry = (tabId: string, profile_id: string) => ({ tabId, profile_id });

describe("crossTabPresenceFingerprint", () => {
  it("sorts tabId:profile_id pairs", () => {
    expect(
      crossTabPresenceFingerprint([
        entry("b", "7Xk9mP2nQ4rT6vW8yZ1aB3cD6"),
        entry("a", "7Xk9mP2nQ4rT6vW8yZ1aB3cD5"),
      ])
    ).toBe(
      "a:7Xk9mP2nQ4rT6vW8yZ1aB3cD5|b:7Xk9mP2nQ4rT6vW8yZ1aB3cD6"
    );
  });

  it("returns empty string for no entries", () => {
    expect(crossTabPresenceFingerprint([])).toBe("");
  });
});

describe("stableCrossTabLaneAfterRead", () => {
  const raw = [entry("t1", "7Xk9mP2nQ4rT6vW8yZ1aB3cD5")];
  const fp = crossTabPresenceFingerprint(raw);

  it("hides immediately when presence clears", () => {
    expect(
      stableCrossTabLaneAfterRead({
        rawEntries: [],
        tabNoticeCount: 0,
        shouldShow,
        previousStreak: 3,
        previousFingerprint: fp,
      })
    ).toMatchObject({ show: false, streak: 0, entries: [] });
  });

  it("hides immediately when tab notice blocks", () => {
    expect(
      stableCrossTabLaneAfterRead({
        rawEntries: raw,
        tabNoticeCount: 1,
        shouldShow,
        previousStreak: 3,
        previousFingerprint: fp,
      })
    ).toMatchObject({ show: false, streak: 0, entries: [] });
  });

  it("requires two reads with same fingerprint before show", () => {
    const first = stableCrossTabLaneAfterRead({
      rawEntries: raw,
      tabNoticeCount: 0,
      shouldShow,
      previousStreak: 0,
      previousFingerprint: null,
    });
    expect(first.show).toBe(false);
    expect(first.streak).toBe(1);

    const second = stableCrossTabLaneAfterRead({
      rawEntries: raw,
      tabNoticeCount: 0,
      shouldShow,
      previousStreak: first.streak,
      previousFingerprint: first.fingerprint,
    });
    expect(second.show).toBe(true);
    expect(second.entries).toHaveLength(1);
  });

  it("hides when fingerprint changes (label stability)", () => {
    const a = [entry("t1", "7Xk9mP2nQ4rT6vW8yZ1aB3cD5")];
    const b = [entry("t2", "7Xk9mP2nQ4rT6vW8yZ1aB3cD6")];
    const fpA = crossTabPresenceFingerprint(a);

    const shown = stableCrossTabLaneAfterRead({
      rawEntries: a,
      tabNoticeCount: 0,
      shouldShow,
      previousStreak: 1,
      previousFingerprint: fpA,
    });
    expect(shown.show).toBe(true);

    const afterChange = stableCrossTabLaneAfterRead({
      rawEntries: b,
      tabNoticeCount: 0,
      shouldShow,
      previousStreak: shown.streak,
      previousFingerprint: shown.fingerprint,
    });
    expect(afterChange.show).toBe(false);
    expect(afterChange.streak).toBe(1);
  });
});

describe("computeCrossTabNotificationState", () => {
  const genericRaw = [entry("t1", "7Xk9mP2nQ4rT6vW8yZ1aB3cD5")];
  const orphanRaw = [entry("t2", "7Xk9mP2nQ4rT6vW8yZ1aB3cD6")];

  it("forces both lanes hidden when tabNoticeCount > 0", () => {
    const state = computeCrossTabNotificationState({
      tabNoticeCount: 1,
      genericRaw,
      orphanRaw,
      genericStreak: 5,
      orphanStreak: 5,
      genericPreviousFingerprint: crossTabPresenceFingerprint(genericRaw),
      orphanPreviousFingerprint: crossTabPresenceFingerprint(orphanRaw),
      shouldShowGeneric: shouldShow,
      shouldShowOrphan: shouldShow,
    });
    expect(state.showGeneric).toBe(false);
    expect(state.showOrphan).toBe(false);
    expect(state.badgeContribution).toBe(0);
  });

  it("stabilizes generic and orphan lanes independently", () => {
    const gFp = crossTabPresenceFingerprint(genericRaw);
    const first = computeCrossTabNotificationState({
      tabNoticeCount: 0,
      genericRaw,
      orphanRaw: [],
      shouldShowGeneric: shouldShow,
      shouldShowOrphan: shouldShow,
    });
    expect(first.showGeneric).toBe(false);
    expect(first.genericStreak).toBe(1);

    const second = computeCrossTabNotificationState({
      tabNoticeCount: 0,
      genericRaw,
      orphanRaw: [],
      genericStreak: first.genericStreak,
      genericPreviousFingerprint: gFp,
      shouldShowGeneric: shouldShow,
      shouldShowOrphan: shouldShow,
    });
    expect(second.showGeneric).toBe(true);
    expect(second.badgeContribution).toBe(1);
  });

  it("sums badge contribution when both lanes show", () => {
    const gFp = crossTabPresenceFingerprint(genericRaw);
    const oFp = crossTabPresenceFingerprint(orphanRaw);
    const state = computeCrossTabNotificationState({
      tabNoticeCount: 0,
      genericRaw,
      orphanRaw,
      genericStreak: CROSS_TAB_MIN_SHOW_STREAK,
      genericPreviousFingerprint: gFp,
      orphanStreak: CROSS_TAB_MIN_SHOW_STREAK,
      orphanPreviousFingerprint: oFp,
      shouldShowGeneric: shouldShow,
      shouldShowOrphan: shouldShow,
    });
    expect(state.showGeneric).toBe(true);
    expect(state.showOrphan).toBe(true);
    expect(state.badgeContribution).toBe(2);
  });
});

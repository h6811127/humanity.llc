import { describe, expect, it } from "vitest";

import {
  isIosWebKitUserAgent,
  isSafariItpNoticeDismissSnoozed,
  SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS,
  shouldShowSafariItpStorageNotice,
} from "../../site/js/safari-itp-storage-notice-core.mjs";

const baseInput = {
  pathname: "/",
  isIosWebKit: true,
  savedCardCount: 1,
  dismissedAtIso: null,
  deviceStatusLoadError: false,
};

describe("shouldShowSafariItpStorageNotice (P2-1)", () => {
  it("shows for returning steward on iOS shell pages", () => {
    expect(shouldShowSafariItpStorageNotice(baseInput)).toBe(true);
    expect(
      shouldShowSafariItpStorageNotice({ ...baseInput, pathname: "/wallet/" })
    ).toBe(true);
  });

  it("hides off iOS, on scan/create, without saved cards, or when status failed to load", () => {
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, isIosWebKit: false })).toBe(
      false
    );
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, pathname: "/c/abc" })).toBe(
      false
    );
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, pathname: "/create/" })).toBe(
      false
    );
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, savedCardCount: 0 })).toBe(
      false
    );
    expect(
      shouldShowSafariItpStorageNotice({ ...baseInput, deviceStatusLoadError: true })
    ).toBe(false);
  });

  it("respects 7-day dismiss snooze", () => {
    const recent = new Date(Date.now() - SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS + 60_000).toISOString();
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, dismissedAtIso: recent })).toBe(
      false
    );
    const expired = new Date(
      Date.now() - SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS - 60_000
    ).toISOString();
    expect(shouldShowSafariItpStorageNotice({ ...baseInput, dismissedAtIso: expired })).toBe(
      true
    );
  });
});

describe("isIosWebKitUserAgent", () => {
  it("detects iPhone and iPadOS desktop UA", () => {
    expect(isIosWebKitUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      true
    );
    expect(
      isIosWebKitUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X)", {
        platform: "MacIntel",
        maxTouchPoints: 5,
      })
    ).toBe(true);
    expect(isIosWebKitUserAgent("Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});

describe("isSafariItpNoticeDismissSnoozed", () => {
  it("returns false for missing or invalid timestamps", () => {
    expect(isSafariItpNoticeDismissSnoozed(null)).toBe(false);
    expect(isSafariItpNoticeDismissSnoozed("not-a-date")).toBe(false);
  });
});

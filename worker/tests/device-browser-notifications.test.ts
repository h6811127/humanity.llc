import { describe, expect, it } from "vitest";

import {
  osNotificationContentForLiveProof,
  shouldShowBrowserNotifPrompt,
} from "../../site/js/device-browser-notifications-core.mjs";

describe("shouldShowBrowserNotifPrompt", () => {
  it("shows when live proof pending, tab visible, not enabled or dismissed", () => {
    expect(
      shouldShowBrowserNotifPrompt({
        supported: true,
        enabled: false,
        dismissed: false,
        pendingCount: 1,
        tabVisible: true,
      })
    ).toBe(true);
  });

  it("hides when already enabled or dismissed or tab hidden", () => {
    expect(
      shouldShowBrowserNotifPrompt({
        enabled: true,
        pendingCount: 1,
        tabVisible: true,
      })
    ).toBe(false);
    expect(
      shouldShowBrowserNotifPrompt({
        dismissed: true,
        pendingCount: 1,
        tabVisible: true,
      })
    ).toBe(false);
    expect(
      shouldShowBrowserNotifPrompt({
        pendingCount: 1,
        tabVisible: false,
      })
    ).toBe(false);
    expect(shouldShowBrowserNotifPrompt({ pendingCount: 0, tabVisible: true })).toBe(
      false
    );
  });
});

describe("osNotificationContentForLiveProof", () => {
  it("uses card label as title and sign CTA in body", () => {
    expect(
      osNotificationContentForLiveProof({
        entry: { label: "Studio pass", profile_id: "abc" },
      })
    ).toEqual({
      title: "Studio pass",
      body: "Live proof waiting · tap to sign",
    });
  });
});

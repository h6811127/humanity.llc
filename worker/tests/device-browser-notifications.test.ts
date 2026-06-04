import { describe, expect, it } from "vitest";

import {
  inboxKindAllowsOsNotification,
  isBrowserNotifEnabled,
  osNotificationContentForLiveProof,
  shouldShowBrowserNotifPrompt,
} from "../../site/js/device-browser-notifications-core.mjs";

describe("isBrowserNotifEnabled", () => {
  it("reads hc_browser_notif storage", () => {
    expect(isBrowserNotifEnabled(() => "on")).toBe(true);
    expect(isBrowserNotifEnabled(() => "off")).toBe(false);
    expect(isBrowserNotifEnabled(() => null)).toBe(false);
  });
});

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

describe("inboxKindAllowsOsNotification (WS-NOTIF N1)", () => {
  it("allows U0 kinds live_proof and relay_offer", () => {
    expect(inboxKindAllowsOsNotification("live_proof")).toBe(true);
    expect(inboxKindAllowsOsNotification("relay_offer")).toBe(true);
    expect(inboxKindAllowsOsNotification("tab_keys_unsaved")).toBe(false);
    expect(inboxKindAllowsOsNotification("cross_tab_keys")).toBe(false);
    expect(inboxKindAllowsOsNotification("card_disabled_since_visit")).toBe(false);
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

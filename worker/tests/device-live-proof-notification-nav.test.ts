import { describe, expect, it } from "vitest";

import {
  HC_NOTIFICATION_NAVIGATE,
  notificationNavigateMessage,
  notificationNavSameOrigin,
  pickNotificationNavigateClient,
} from "../../site/js/device-live-proof-notification-nav-core.mjs";

describe("live-proof notification navigation", () => {
  it("builds postMessage payload", () => {
    expect(notificationNavigateMessage("https://humanity.llc/created/?x=1")).toEqual({
      type: HC_NOTIFICATION_NAVIGATE,
      href: "https://humanity.llc/created/?x=1",
    });
  });

  it("matches same-origin clients only", () => {
    const clients = [
      { url: "https://evil.example/wallet/" },
      { url: "https://humanity.llc/wallet/" },
    ];
    expect(
      pickNotificationNavigateClient(
        clients,
        "https://humanity.llc/created/?profile_id=p&live_challenge=c"
      )?.url
    ).toBe("https://humanity.llc/wallet/");
    expect(
      notificationNavSameOrigin("https://humanity.llc/", "https://humanity.llc/created/")
    ).toBe(true);
    expect(
      notificationNavSameOrigin("https://evil.example/", "https://humanity.llc/created/")
    ).toBe(false);
  });
});

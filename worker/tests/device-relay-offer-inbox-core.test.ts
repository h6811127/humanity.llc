import { describe, expect, it } from "vitest";

import {
  parseRelayOfferProfileSummaryBody,
  relayOfferInboxAggregateTitle,
  relayOfferInboxChanged,
  relayOfferInboxRowSubtitle,
} from "../../site/js/device-relay-offer-inbox-core.mjs";

describe("device-relay-offer-inbox-core", () => {
  it("formats aggregate title", () => {
    expect(relayOfferInboxAggregateTitle(0)).toBe("");
    expect(relayOfferInboxAggregateTitle(1)).toBe("1 finder message waiting");
    expect(relayOfferInboxAggregateTitle(3)).toBe("3 finder messages waiting");
  });

  it("formats row subtitle", () => {
    expect(relayOfferInboxRowSubtitle("Blue backpack", 1)).toBe("Blue backpack");
    expect(relayOfferInboxRowSubtitle("Blue backpack", 2)).toBe(
      "Blue backpack · 2 messages"
    );
  });

  it("parses profile summary body", () => {
    const parsed = parseRelayOfferProfileSummaryBody(
      {
        type: "relay_offer_profile_summary",
        total_pending: 2,
        objects: [
          {
            object_id: "obj_relay01",
            public_label: "Blue backpack",
            pending_count: 2,
          },
        ],
      },
      "prof123456789012345678"
    );
    expect(parsed?.totalPending).toBe(2);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]?.objectId).toBe("obj_relay01");
    expect(parsed?.items[0]?.pendingCount).toBe(2);
  });

  it("detects inbox snapshot changes", () => {
    const a = [
      {
        profileId: "p1",
        objectId: "o1",
        publicLabel: "Relay",
        pendingCount: 1,
      },
    ];
    const b = [
      {
        profileId: "p1",
        objectId: "o1",
        publicLabel: "Relay",
        pendingCount: 2,
      },
    ];
    expect(relayOfferInboxChanged(a, a)).toBe(false);
    expect(relayOfferInboxChanged(a, b)).toBe(true);
  });
});

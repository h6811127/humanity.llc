import { describe, expect, it } from "vitest";

import {
  INBOX_KIND_TIER,
  buildInboxItems,
  buildInboxSheetRows,
  inboxBadgeChromaKind,
  inboxItemsIncludeKind,
  inboxKindCountsTowardBadge,
  inboxTier,
  topInboxKind,
} from "../../site/js/device-inbox-core.mjs";

describe("inboxTier (WS-NOTIF N1)", () => {
  it("maps every InboxKind to U0 or U1", () => {
    expect(inboxTier("live_proof")).toBe("U0");
    expect(inboxTier("relay_offer")).toBe("U0");
    expect(inboxTier("cross_tab_keys")).toBe("U1");
    expect(inboxTier("tab_keys_unsaved")).toBe("U1");
    expect(inboxTier("card_disabled_since_visit")).toBe("U1");
    expect(Object.keys(INBOX_KIND_TIER).length).toBe(7);
  });

  it("counts only U0 and U1 toward badge policy helper", () => {
    expect(inboxKindCountsTowardBadge("live_proof")).toBe(true);
    expect(inboxKindCountsTowardBadge("relay_offer")).toBe(true);
    expect(inboxKindCountsTowardBadge("cross_tab_keys")).toBe(true);
  });
});

describe("relay_offer in buildInboxItems", () => {
  it("emits relay_offer after live_proof and includes in badge count", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      relayOfferCount: 3,
      relayOfferPending: [
        {
          profileId: "p1",
          objectId: "o1",
          publicLabel: "Studio relay",
          pendingCount: 2,
        },
        {
          profileId: "p1",
          objectId: "o2",
          publicLabel: "Back door",
          pendingCount: 1,
        },
      ],
      crossTabEntries: [],
    });
    expect(items.map((i) => i.kind)).toEqual(["live_proof", "relay_offer"]);
    expect(items[1].count).toBe(3);
    expect(items[1].title).toBe("3 finder messages waiting");
    expect(inboxItemsIncludeKind(items, "relay_offer")).toBe(true);
    expect(topInboxKind(items)).toBe("live_proof");
    expect(inboxBadgeChromaKind(items)).toBe("live_proof");
  });

  it("uses live_proof badge chroma when relay_offer is top without live proof", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 1,
      relayOfferPending: [
        {
          profileId: "p1",
          objectId: "o1",
          publicLabel: "Relay",
          pendingCount: 1,
        },
      ],
    });
    expect(topInboxKind(items)).toBe("relay_offer");
    expect(inboxBadgeChromaKind(items)).toBe("live_proof");
  });

  it("expands relay_offer into sheet rows", () => {
    const pending = [
      {
        profileId: "p1",
        objectId: "o1",
        publicLabel: "Studio relay",
        pendingCount: 2,
      },
    ];
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 2,
      relayOfferPending: pending,
    });
    const rows = buildInboxSheetRows(items, { relayOfferPending: pending });
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("relay_offer");
    expect(rows[0].title).toBe("Studio relay");
    expect(rows[0].subtitle).toContain("2 messages");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildInboxItems,
} from "../../site/js/device-inbox-core.mjs";
import {
  buildForegroundAttentionPlan,
  buildOsNotificationPlans,
  buildShellBadgeDeliveryPlan,
  filterOsPlansByDedupe,
  hubInboxGroupVisibilityFromItems,
  liveProofPendingFromInbox,
  relayOfferPendingFromInbox,
} from "../../site/js/device-notification-delivery-core.mjs";

describe("buildShellBadgeDeliveryPlan", () => {
  it("derives chroma from inbox items (live proof over relay)", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "Door" } }],
      relayOfferCount: 2,
      relayOfferPending: [
        {
          profileId: "p1",
          objectId: "o1",
          publicLabel: "Relay",
          pendingCount: 2,
        },
      ],
    });
    const plan = buildShellBadgeDeliveryPlan(items);
    expect(plan.count).toBe(3);
    expect(plan.hidden).toBe(false);
    expect(plan.chromaKind).toBe("live_proof");
    expect(plan.countText).toBe("3");
  });
});

describe("hubInboxGroupVisibilityFromItems", () => {
  it("shows relay_offer only when inbox item exists", () => {
    const withRelay = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 1,
      relayOfferPending: [
        { profileId: "p1", objectId: "o1", publicLabel: "R", pendingCount: 1 },
      ],
    });
    expect(hubInboxGroupVisibilityFromItems(withRelay).relay_offer).toBe(true);

    const empty = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 0,
    });
    expect(hubInboxGroupVisibilityFromItems(empty).relay_offer).toBe(false);
  });
});

describe("inbox meta pending helpers", () => {
  it("reads relay and live proof pending from item meta", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "x", entry: { label: "A" } }],
      relayOfferCount: 1,
      relayOfferPending: [
        { profileId: "p", objectId: "o", publicLabel: "L", pendingCount: 1 },
      ],
    });
    expect(liveProofPendingFromInbox(items)).toHaveLength(1);
    expect(relayOfferPendingFromInbox(items)).toHaveLength(1);
  });
});

describe("buildOsNotificationPlans", () => {
  it("emits U0 plans for live_proof and relay_offer from inbox", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "Studio" } }],
      relayOfferCount: 2,
      relayOfferPending: [],
    });
    const plans = buildOsNotificationPlans(items, {
      pageOrigin: "https://humanity.llc",
      tabVisible: false,
    });
    expect(plans.map((p) => p.kind)).toEqual(["live_proof", "relay_offer"]);
    expect(plans[0].dedupeKey).toBe("c1");
    expect(plans[1].openInboxOnClick).toBe(true);
  });

  it("dedupes unchanged signatures per kind", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: {} }],
      relayOfferCount: 0,
    });
    const plans = buildOsNotificationPlans(items);
    const first = filterOsPlansByDedupe(plans, {});
    expect(first.plans).toHaveLength(1);
    const second = filterOsPlansByDedupe(plans, first.nextDedupe);
    expect(second.plans).toHaveLength(0);
  });
});

describe("buildForegroundAttentionPlan", () => {
  it("shows strip when tab visible and U0 inbox item exists", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 1,
      relayOfferPending: [
        { profileId: "p", objectId: "o", publicLabel: "L", pendingCount: 1 },
      ],
    });
    const plan = buildForegroundAttentionPlan(items, { tabVisible: true });
    expect(plan.show).toBe(true);
    expect(plan.topU0Kind).toBe("relay_offer");
  });

  it("hides strip when tab hidden", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "A" } }],
    });
    const plan = buildForegroundAttentionPlan(items, { tabVisible: false });
    expect(plan.show).toBe(false);
    expect(plan.topU0Kind).toBeNull();
  });
});

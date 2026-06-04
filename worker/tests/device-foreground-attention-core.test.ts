import { describe, expect, it } from "vitest";

import { buildInboxItems } from "../../site/js/device-inbox-core.mjs";
import { buildForegroundAttentionStripModel } from "../../site/js/device-foreground-attention-core.mjs";

describe("buildForegroundAttentionStripModel", () => {
  it("builds live proof strip when U0 pending exists", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "Studio door" } }],
    });
    const model = buildForegroundAttentionStripModel(items, { tabVisible: true });
    expect(model.visible).toBe(true);
    expect(model.kind).toBe("live_proof");
    expect(model.ctaLabel).toBe("Prove control now");
    expect(model.proofItem).toMatchObject({ challenge_id: "c1" });
  });

  it("prefers live_proof over relay_offer when both U0", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "Door" } }],
      relayOfferCount: 2,
      relayOfferPending: [
        { profileId: "p", objectId: "o", publicLabel: "Relay", pendingCount: 2 },
      ],
    });
    const model = buildForegroundAttentionStripModel(items, { tabVisible: true });
    expect(model.kind).toBe("live_proof");
  });

  it("hides when tab not visible", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 1,
      liveProofPending: [{ challenge_id: "c1", entry: { label: "Door" } }],
    });
    expect(
      buildForegroundAttentionStripModel(items, { tabVisible: false }).visible
    ).toBe(false);
  });

  it("builds relay strip with open inbox action", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      relayOfferCount: 1,
      relayOfferPending: [
        { profileId: "p", objectId: "o", publicLabel: "Relay", pendingCount: 1 },
      ],
    });
    const model = buildForegroundAttentionStripModel(items, { tabVisible: true });
    expect(model.visible).toBe(true);
    expect(model.kind).toBe("relay_offer");
    expect(model.openInboxOnClick).toBe(true);
  });
});

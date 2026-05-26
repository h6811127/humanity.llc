/**
 * Hub frontend pipeline — tab presence, live-control inbox, wallet network, status counts.
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md § Optional hub polish
 */
import { describe, expect, it } from "vitest";

import {
  buildDeviceCountsLabel,
  buildStatusSegmentsFromCounts,
  tabNoticeCountFromState,
} from "../../site/js/device-counts-core.mjs";
import {
  buildInboxItems,
  inboxCountFromItems,
  inboxItemsIncludeKind,
} from "../../site/js/device-inbox-core.mjs";
import {
  liveControlPendingSignature,
  summarizeLiveControlPoll,
} from "../../site/js/device-live-control-inbox-core.mjs";
import { shouldShowCrossTabKeysNotice } from "../../site/js/device-cross-tab-visibility.mjs";
import { listOtherTabsWithKeys } from "../../site/js/device-tab-presence-core.mjs";
import {
  CARD_REVOKED_ALERT_STATE,
  listCardDisabledSinceVisit,
} from "../../site/js/wallet-network-baseline.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "7Xk9mP2nQ4rT6vW8yZ1aB3cD6";

describe("pipeline: tab presence → inbox", () => {
  const now = 100_000;

  it("feeds cross-tab inbox row when another tab has keys and this tab has no unsaved notice", () => {
    const map = {
      self: { profile_id: PROFILE_A, updatedAt: now },
      other: { profile_id: PROFILE_B, updatedAt: now, label: "Tab B" },
    };
    const { others } = listOtherTabsWithKeys({
      map,
      tabId: "self",
      thisProfile: PROFILE_A,
      now,
    });
    const tabNotice = tabNoticeCountFromState(
      { profile_id: PROFILE_A, owner_private_key_b58: "k" },
      true
    );
    expect(tabNotice).toBe(0);
    const crossTabCount = shouldShowCrossTabKeysNotice(others.length, tabNotice)
      ? others.length
      : 0;
    const items = buildInboxItems({
      tabNoticeCount: tabNotice,
      liveProofCount: 0,
      crossTabEntries: others,
    });
    expect(crossTabCount).toBe(1);
    expect(inboxItemsIncludeKind(items, "cross_tab_keys")).toBe(true);
    expect(inboxCountFromItems(items)).toBe(1);
  });

  it("suppresses cross-tab inbox when tab keys notice is active", () => {
    const crossTabCount = shouldShowCrossTabKeysNotice(1, 1) ? 1 : 0;
    const items = buildInboxItems({
      tabNoticeCount: 1,
      liveProofCount: 0,
      crossTabEntries: [{ profile_id: PROFILE_B, tabId: "other" }],
    });
    expect(crossTabCount).toBe(0);
    expect(items.map((i) => i.kind)).toEqual(["tab_keys_unsaved"]);
  });
});

describe("pipeline: live-control poll → inbox", () => {
  const entry = { profile_id: PROFILE_A, qr_id: "qr_test_pipeline_1" };

  it("maps pending challenges to live_proof inbox count", () => {
    const item = {
      entry,
      challenge_id: "c1",
      return_url: null,
      owner_url: null,
      expires_at: "",
    };
    const { pending } = summarizeLiveControlPoll(
      [{ kind: "pending", item }, { kind: "none" }],
      2
    );
    expect(pending).toHaveLength(1);
    expect(liveControlPendingSignature(pending)).toBe(`${PROFILE_A}:c1`);

    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: pending.length,
      crossTabEntries: [],
    });
    expect(items[0]?.kind).toBe("live_proof");
    expect(items[0]?.count).toBe(1);
  });

  it("surfaces proof-check limited segment when poll is degraded", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "ok",
      saved: 1,
      pins: 0,
      notices: 0,
      liveProof: 0,
      pollableSaved: 2,
      liveProofPollHealth: "degraded",
    });
    expect(segments.some((s) => s.id === "liveproof" && s.label.includes("Limited"))).toBe(
      true
    );
  });
});

describe("pipeline: wallet network → inbox", () => {
  it("maps since-visit disabled cards into inbox badge count", () => {
    const wallet = [
      { profile_id: PROFILE_A, label: "Card A" },
      { profile_id: PROFILE_B, label: "Card B" },
    ];
    const disabled = listCardDisabledSinceVisit(
      wallet,
      { [PROFILE_A]: CARD_REVOKED_ALERT_STATE, [PROFILE_B]: "active" },
      { [PROFILE_A]: "card_revoked", [PROFILE_B]: "active" },
      { [PROFILE_A]: "active", [PROFILE_B]: "active" },
      { [PROFILE_A]: true, [PROFILE_B]: true }
    );
    expect(disabled).toHaveLength(1);
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [],
      cardDisabledSinceVisit: disabled,
    });
    expect(items[0]?.kind).toBe("card_disabled_since_visit");
    expect(inboxCountFromItems(items)).toBe(1);
  });
});

describe("pipeline: status counts label", () => {
  it("builds compact saved/pinned label for hub chrome", () => {
    expect(buildDeviceCountsLabel(2, 1)).toEqual({
      saved: 2,
      pins: 1,
      total: 3,
      label: "2 on Device · 1 Pinned",
    });
  });

  it("omits live proof segment when resolver is offline but still shows network", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "offline",
      saved: 1,
      pins: 0,
      notices: 0,
      liveProof: 0,
      pollableSaved: 1,
      liveProofPollHealth: "offline",
    });
    const network = segments.find((s) => s.id === "network");
    expect(network?.chipLabel).toBe("Offline");
    expect(segments.filter((s) => s.id === "liveproof")).toHaveLength(1);
  });
});

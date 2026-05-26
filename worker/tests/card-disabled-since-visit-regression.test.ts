/**
 * Regression gates for the card-disabled-since-visit false-positive incident.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md
 * @see docs/DEVICE_HUB_REPAIR_SPEC.md (Slices 1–8)
 */
import { describe, expect, it } from "vitest";

import {
  buildGlanceRowPlan,
  buildInboxItems,
  inboxCountFromItems,
} from "../../site/js/device-inbox-core.mjs";
import {
  shouldUseCachedNetworkStatus,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "../../site/js/device-wallet-network-core.mjs";
import {
  CARD_REVOKED_ALERT_STATE,
  cardDisabledSinceVisitVisible,
  listCardDisabledSinceVisit,
  shouldShowCardDisabledSinceVisitAlert,
} from "../../site/js/wallet-network-baseline.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("card-disabled since-visit regression gates (Slice 8)", () => {
  it("refuses stale session cache when baseline is active (forces refetch)", () => {
    const now = 1_000_000;
    const cached = {
      status: "active",
      scanKind: "card_revoked",
      at: now,
    };
    expect(
      shouldUseCachedNetworkStatus(
        { [PROFILE]: "active" },
        PROFILE,
        cached,
        now,
        WALLET_NETWORK_CACHE_TTL_MS
      )
    ).toBe(false);
  });

  it("does not list inbox/hub targets from cache-only card_revoked", () => {
    const wallet = [{ profile_id: PROFILE, label: "Test" }];
    const staleAlert = CARD_REVOKED_ALERT_STATE;
    expect(
      listCardDisabledSinceVisit(
        wallet,
        { [PROFILE]: staleAlert },
        { [PROFILE]: "card_revoked" },
        { [PROFILE]: "active" },
        { [PROFILE]: false }
      )
    ).toEqual([]);
    expect(
      shouldShowCardDisabledSinceVisitAlert("active", "active", {
        resolverConfirmed: false,
      })
    ).toBe(false);
  });

  it("does not list targets when resolver confirms active despite stale-shaped alert state", () => {
    const wallet = [{ profile_id: PROFILE, label: "Test" }];
    expect(
      listCardDisabledSinceVisit(
        wallet,
        { [PROFILE]: "active" },
        { [PROFILE]: "active" },
        { [PROFILE]: "active" },
        { [PROFILE]: true }
      )
    ).toEqual([]);
    expect(
      cardDisabledSinceVisitVisible("card_revoked", "active", "active", true)
    ).toBe(false);
  });

  it("keeps glance saved-row suffix off when inbox has no card_disabled rows", () => {
    const items = buildInboxItems({
      tabNoticeCount: 0,
      liveProofCount: 0,
      crossTabEntries: [],
      cardDisabledSinceVisit: [],
    });
    expect(inboxCountFromItems(items)).toBe(0);
    const plan = buildGlanceRowPlan(
      items,
      [{ profile_id: PROFILE, label: "Test" }],
      { revokedHintProfileIds: new Set() }
    );
    const walletRow = plan.find((r) => r.type === "wallet");
    expect(walletRow?.type === "wallet" && walletRow.revokedHint).toBe(false);
  });
});

/**
 * A3 SSOT: chip + since-visit read one poll snapshot per profile.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSinceVisitPollMapsFromTruth,
  getWalletNetworkTruthChipStatus,
  isSinceVisitBlockedChipStatus,
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromCacheOnly,
  setWalletNetworkTruthFromPoll,
  shouldSuppressCardDisabledSinceVisitFromTruth,
} from "../../site/js/device-wallet-network-truth.mjs";
import { CARD_REVOKED_ALERT_STATE } from "../../site/js/wallet-network-baseline.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("device-wallet-network-truth (A3 SSOT)", () => {
  beforeEach(() => {
    resetWalletNetworkTruth();
  });

  it("treats checking chip as blocked for since-visit UI", () => {
    expect(isSinceVisitBlockedChipStatus("checking")).toBe(true);
    expect(isSinceVisitBlockedChipStatus("offline")).toBe(true);
    expect(isSinceVisitBlockedChipStatus("active")).toBe(false);
  });

  it("cache-only row has no since-visit maps", () => {
    setWalletNetworkTruthFromCacheOnly(PROFILE, {
      chipStatus: "active",
      scanKind: "card_revoked",
    });
    expect(buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }])).toBeNull();
    expect(shouldSuppressCardDisabledSinceVisitFromTruth(PROFILE)).toBe(true);
  });

  it("poll row exposes maps and chip; cache-only replaces poll authority", () => {
    setWalletNetworkTruthFromPoll(PROFILE, {
      chipStatus: "active",
      scanKind: "card_revoked",
      alertState: CARD_REVOKED_ALERT_STATE,
    });
    const maps = buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }]);
    expect(maps?.alertStateMap[PROFILE]).toBe(CARD_REVOKED_ALERT_STATE);
    expect(maps?.scanKindMap[PROFILE]).toBe("card_revoked");
    expect(getWalletNetworkTruthChipStatus(PROFILE)).toBe("active");
    expect(shouldSuppressCardDisabledSinceVisitFromTruth(PROFILE)).toBe(false);

    setWalletNetworkTruthFromCacheOnly(PROFILE, {
      chipStatus: "checking",
      scanKind: null,
    });
    expect(buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }])).toBeNull();
    expect(getWalletNetworkTruthChipStatus(PROFILE)).toBe("checking");
    expect(shouldSuppressCardDisabledSinceVisitFromTruth(PROFILE)).toBe(true);
  });

  it("suppresses since-visit when poll chip is checking (split-brain guard)", () => {
    setWalletNetworkTruthFromPoll(PROFILE, {
      chipStatus: "checking",
      scanKind: "card_revoked",
      alertState: CARD_REVOKED_ALERT_STATE,
    });
    expect(shouldSuppressCardDisabledSinceVisitFromTruth(PROFILE)).toBe(true);
    expect(buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }])).not.toBeNull();
  });

  it("cache-only with active scanKind clears prior poll card_revoked maps (G2)", () => {
    setWalletNetworkTruthFromPoll(PROFILE, {
      chipStatus: "active",
      scanKind: "card_revoked",
      alertState: CARD_REVOKED_ALERT_STATE,
    });
    expect(buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }])).not.toBeNull();
    setWalletNetworkTruthFromCacheOnly(PROFILE, {
      chipStatus: "active",
      scanKind: "active",
    });
    expect(buildSinceVisitPollMapsFromTruth([{ profile_id: PROFILE }])).toBeNull();
  });
});

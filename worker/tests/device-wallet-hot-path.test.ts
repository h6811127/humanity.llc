import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getCardStatusUrl: (profileId, qrId) =>
    `https://example.test/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`,
}));

import {
  findWalletEntryByProfileId,
  getWalletLength,
  invalidateWalletCache,
  loadWallet,
} from "../../site/js/device-wallet.mjs";
import { buildResolverConfirmedWalletPollMaps } from "../../site/js/device-wallet-network.mjs";
import {
  buildSinceVisitPollMapsFromTruth,
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromPoll,
} from "../../site/js/device-wallet-network-truth.mjs";
import { CARD_REVOKED_ALERT_STATE } from "../../site/js/wallet-network-baseline.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("device-wallet hot path (Priority 5)", () => {
  /** @type {Map<string, string>} */
  let localStore;

  beforeEach(() => {
    resetWalletNetworkTruth();
    invalidateWalletCache();
    localStore = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => {
        localStore.set(key, String(value));
      },
      removeItem: (key) => {
        localStore.delete(key);
      },
      clear: () => localStore.clear(),
    });
  });

  it("getWalletLength and findWalletEntryByProfileId avoid full-array copy", () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      id: `w${i}`,
      profile_id: `profile_${i}`,
      label: `Card ${i}`,
    }));
    localStore.set("hc_wallet", JSON.stringify(entries));
    const sliceSpy = vi.spyOn(Array.prototype, "slice");
    sliceSpy.mockClear();

    expect(getWalletLength()).toBe(12);
    expect(sliceSpy).not.toHaveBeenCalled();

    const row = findWalletEntryByProfileId("profile_3");
    expect(row?.label).toBe("Card 3");
    expect(sliceSpy).not.toHaveBeenCalled();

    sliceSpy.mockRestore();
  });

  it("loadWallet still returns a mutable copy for save flows", () => {
    localStore.set(
      "hc_wallet",
      JSON.stringify([{ id: "w1", profile_id: PROFILE, label: "One" }])
    );
    const copy = loadWallet();
    copy.push({ id: "w2", profile_id: "other", label: "Two" });
    expect(getWalletLength()).toBe(1);
  });

  it("buildResolverConfirmedWalletPollMaps without entries does not read hc_wallet", () => {
    localStore.set(
      "hc_wallet",
      JSON.stringify([{ id: "w1", profile_id: PROFILE, label: "One" }])
    );
    setWalletNetworkTruthFromPoll(PROFILE, {
      chipStatus: "active",
      scanKind: "card_revoked",
      alertState: CARD_REVOKED_ALERT_STATE,
    });
    invalidateWalletCache();

    const maps = buildResolverConfirmedWalletPollMaps();
    expect(maps?.alertStateMap[PROFILE]).toBe(CARD_REVOKED_ALERT_STATE);
    expect(localStore.has("hc_wallet")).toBe(true);
    expect(buildSinceVisitPollMapsFromTruth()?.resolverConfirmedMap[PROFILE]).toBe(true);
  });
});

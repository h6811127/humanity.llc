import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { resolverJsonResponse } from "./helpers/resolver-fetch-response.mjs";
import { resetWalletNetworkTruth } from "../../site/js/device-wallet-network-truth.mjs";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getCardStatusUrl: (profileId, qrId) =>
    `https://example.test/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`,
}));

import {
  buildResolverConfirmedWalletPollMaps,
  isResolverConfirmedProfile,
  refreshWalletNetworkStatuses,
} from "../../site/js/device-wallet-network.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "../../site/js/device-inbox-card-disabled.mjs";
import { setResolverHealthStatusForSinceVisit } from "../../site/js/device-wallet-since-visit-gate.mjs";
import { setLiveControlPollHealth } from "../../site/js/device-live-control-inbox-core.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nP3oR5sU7wX9zA1bC4dE6";
const QR_A = "qr_E2eWakketTest9";

const ACTIVE_BODY = {
  scan: {
    kind: "active",
    card: { status: "active", handle: "e2e", manifesto_line: "Test" },
  },
};

describe("isResolverConfirmedProfile", () => {
  /** @type {Map<string, string>} */
  let sessionStore;
  /** @type {Map<string, string>} */
  let localStore;

  beforeEach(() => {
    resetWalletNetworkTruth();
    sessionStore = new Map();
    localStore = new Map([
      [
        "hc_wallet",
        JSON.stringify([{ id: "w1", profile_id: PROFILE_A, qr_id: QR_A, label: "Test" }]),
      ],
    ]);
    vi.stubGlobal("sessionStorage", {
      getItem: (key) => sessionStore.get(key) ?? null,
      setItem: (key, value) => {
        sessionStore.set(key, String(value));
      },
      removeItem: (key) => {
        sessionStore.delete(key);
      },
      clear: () => sessionStore.clear(),
    });
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
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    setResolverHealthStatusForSinceVisit("ok");
    setLiveControlPollHealth("ok");
    vi.stubGlobal("fetch", vi.fn(async () => resolverJsonResponse(ACTIVE_BODY)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false before any resolver fetch this visit", () => {
    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(false);
    expect(buildResolverConfirmedWalletPollMaps()).toBeNull();
  });

  it("is true only for profiles fetched this visit", async () => {
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);

    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(true);
    expect(isResolverConfirmedProfile(PROFILE_B)).toBe(false);
  });

  it("buildResolverConfirmedWalletPollMaps includes only resolver-confirmed profiles after poll", async () => {
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);

    const maps = buildResolverConfirmedWalletPollMaps();
    expect(maps).not.toBeNull();
    expect(maps?.alertStateMap[PROFILE_A]).toBe("active");
    expect(maps?.scanKindMap[PROFILE_A]).toBe("active");
    expect(maps?.resolverConfirmedMap[PROFILE_A]).toBe(true);
    expect(maps?.resolverConfirmedMap[PROFILE_B]).toBeUndefined();
  });

  it("clears since-visit after offline poll following resolver-confirmed card_revoked", async () => {
    localStore.set(
      "hc_wallet_last_seen_network",
      JSON.stringify({ [PROFILE_A]: "active" })
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        resolverJsonResponse({
          scan: {
            kind: "card_revoked",
            card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
          },
        })
      )
      .mockRejectedValueOnce(new Error("offline"));

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toHaveLength(1);

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(false);
  });

  it("G2: cache-only poll clears stale latestResolved when cache scanKind disagrees", async () => {
    localStore.set(
      "hc_wallet_last_seen_network",
      JSON.stringify({ [PROFILE_A]: "active" })
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      resolverJsonResponse({
        scan: {
          kind: "card_revoked",
          card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
        },
      })
    );

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(buildResolverConfirmedWalletPollMaps()?.scanKindMap[PROFILE_A]).toBe(
      "card_revoked"
    );

    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE_A]: {
          status: "active",
          scanKind: "active",
          verificationLabel: null,
          verificationState: null,
          at: now,
        },
      })
    );
    fetchMock.mockClear();

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(buildResolverConfirmedWalletPollMaps()).toBeNull();
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
  });

  it("gatherCardDisabledSinceVisitForInbox is empty after active poll despite stale cache", async () => {
    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE_A]: {
          status: "active",
          scanKind: "card_revoked",
          verificationLabel: null,
          verificationState: null,
          at: now,
        },
      })
    );
    localStore.set(
      "hc_wallet_last_seen_network",
      JSON.stringify({ [PROFILE_A]: "active" })
    );

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);

    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
  });
});

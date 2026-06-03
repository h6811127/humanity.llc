import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { resolverJsonResponse } from "./helpers/resolver-fetch-response.mjs";
import {
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromPoll,
} from "../../site/js/device-wallet-network-truth.mjs";
import { CARD_REVOKED_ALERT_STATE } from "../../site/js/wallet-network-baseline.mjs";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getCardStatusUrl: (profileId, qrId) =>
    `https://example.test/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`,
}));

import {
  buildResolverConfirmedWalletPollMaps,
  getCachedNetworkQrScope,
  getCachedNetworkScanKind,
  getCachedNetworkStatus,
  isResolverConfirmedProfile,
  refreshWalletNetworkStatuses,
} from "../../site/js/device-wallet-network.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "../../site/js/device-inbox-card-disabled.mjs";
import {
  getWalletStatusPollHealth,
  setResolverHealthStatusForSinceVisit,
  setWalletStatusPollHealthForSinceVisit,
} from "../../site/js/device-wallet-since-visit-gate.mjs";
import { setLiveControlPollHealth } from "../../site/js/device-live-control-inbox-core.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nP3oR5sU7wX9zA1bC4dE6";
const QR_A = "qr_E2eWakketTest9";

const ACTIVE_BODY = {
  scan: {
    kind: "active",
    card: { status: "active", handle: "e2e", manifesto_line: "Test" },
    qr: { status: "active", scope: "card" },
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
    setWalletStatusPollHealthForSinceVisit("ok");
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

  it("persists resolver QR scope into cache and wallet row", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resolverJsonResponse({
        scan: {
          kind: "active",
          card: { status: "active", handle: "e2e", manifesto_line: "Test" },
          qr: { status: "active", scope: "print_artifact" },
        },
      })
    );

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);

    expect(getCachedNetworkQrScope(PROFILE_A)).toBe("print_artifact");
    const wallet = JSON.parse(localStore.get("hc_wallet") || "[]");
    expect(wallet[0].qr_scope).toBe("print_artifact");
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

  it("stale poll generation does not overwrite truth after a newer poll completes first", async () => {
    localStore.set(
      "hc_wallet_last_seen_network",
      JSON.stringify({ [PROFILE_A]: "active" })
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve(
                  resolverJsonResponse({
                    scan: {
                      kind: "card_revoked",
                      card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
                    },
                  })
                ),
              40
            );
          })
      )
      .mockResolvedValueOnce(resolverJsonResponse(ACTIVE_BODY));

    let gen = 1;
    const slow = refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }], undefined, {
      generation: 1,
      isCurrentGeneration: () => gen === 1,
    });
    gen = 2;
    const fast = refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }], undefined, {
      generation: 2,
      isCurrentGeneration: () => gen === 2,
    });
    await fast;
    await slow;

    expect(buildResolverConfirmedWalletPollMaps()?.scanKindMap[PROFILE_A]).toBe("active");
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
  });

  it("active poll after card_revoked drops since-visit SSOT (out-of-order safe)", async () => {
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
      .mockResolvedValueOnce(resolverJsonResponse(ACTIVE_BODY));

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toHaveLength(1);

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
    expect(buildResolverConfirmedWalletPollMaps()?.alertStateMap[PROFILE_A]).toBe("active");
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

  it("partial poll demotes stale poll truth on cards not in this refresh tick", async () => {
    localStore.set(
      "hc_wallet",
      JSON.stringify([
        { id: "w1", profile_id: PROFILE_A, qr_id: QR_A, label: "A" },
        { id: "w2", profile_id: PROFILE_B, qr_id: "qr_B", label: "B" },
      ])
    );
    setWalletNetworkTruthFromPoll(PROFILE_B, {
      chipStatus: "active",
      scanKind: "card_revoked",
      alertState: CARD_REVOKED_ALERT_STATE,
    });
    expect(
      buildResolverConfirmedWalletPollMaps()?.alertStateMap[PROFILE_B]
    ).toBe(CARD_REVOKED_ALERT_STATE);

    vi.mocked(fetch).mockResolvedValueOnce(resolverJsonResponse(ACTIVE_BODY));
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);

    expect(isResolverConfirmedProfile(PROFILE_B)).toBe(false);
    expect(
      buildResolverConfirmedWalletPollMaps()?.alertStateMap[PROFILE_B]
    ).toBeUndefined();
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
  });

  it("sets wallet status poll health degraded on HTTP 429 (G4)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resolverJsonResponse({}, 429));
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(getWalletStatusPollHealth()).toBe("degraded");
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it("forceRefresh bypasses fresh offline cache (manual Check network)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(resolverJsonResponse(ACTIVE_BODY));
    await refreshWalletNetworkStatuses(
      [{ profile_id: PROFILE_A, qr_id: QR_A }],
      undefined,
      { forceRefresh: true }
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(true);
  });

  it("404 status JSON maps to unknown scan kind (not generic resolver error)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resolverJsonResponse(
        {
          scan: {
            kind: "unknown_profile",
            profile_id: PROFILE_A,
            qr_id: QR_A,
            card: { status: null, handle: null, manifesto_line: null },
          },
        },
        404
      )
    );
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(getCachedNetworkScanKind(PROFILE_A)).toBe("unknown_profile");
    expect(getCachedNetworkStatus(PROFILE_A)).toBe("unknown");
    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(false);
  });

  it("410 card_revoked JSON still resolves disabled state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resolverJsonResponse(
        {
          scan: {
            kind: "card_revoked",
            profile_id: PROFILE_A,
            qr_id: QR_A,
            card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
            qr: { status: "active", scope: "card" },
          },
        },
        410
      )
    );
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE_A, qr_id: QR_A }]);
    expect(getCachedNetworkScanKind(PROFILE_A)).toBe("card_revoked");
    expect(isResolverConfirmedProfile(PROFILE_A)).toBe(true);
    expect(buildResolverConfirmedWalletPollMaps()?.alertStateMap[PROFILE_A]).toBe(
      CARD_REVOKED_ALERT_STATE
    );
  });
});

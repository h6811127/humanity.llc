/**
 * Fourth pass: reproduce G1 split-brain preconditions and verify fix-approach invariants.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md § Fourth pass
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getCardStatusUrl: (profileId, qrId) =>
    `https://example.test/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`,
}));

import {
  buildResolverConfirmedWalletPollMaps,
  getCachedNetworkStatus,
  isResolverConfirmedProfile,
  refreshWalletNetworkStatuses,
  shouldSuppressCardDisabledSinceVisitForProfile,
} from "../../site/js/device-wallet-network.mjs";
import { gatherCardDisabledSinceVisitForInbox } from "../../site/js/device-inbox-card-disabled.mjs";
import {
  cardDisabledSinceVisitVisible,
  CARD_REVOKED_ALERT_STATE,
} from "../../site/js/wallet-network-baseline.mjs";
import {
  setResolverHealthStatusForSinceVisit,
  shouldSuppressCardDisabledSinceVisitAlerts,
} from "../../site/js/device-wallet-since-visit-gate.mjs";
import { setLiveControlPollHealth } from "../../site/js/device-live-control-inbox-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_E2eWakketTest9";

/** Mirrors device-hub-ui.mjs currentNetworkStatus + offline row guard (G1). */
function hubWouldShowSinceVisitBanner(
  profileId,
  statusMap,
  alertStateMap,
  scanKindMap,
  resolverConfirmedMap
) {
  if (alertStateMap == null || alertStateMap[profileId] === undefined) return false;
  const netStatus = String(
    statusMap[profileId] ?? getCachedNetworkStatus(profileId) ?? "checking"
  ).toLowerCase();
  if (netStatus === "offline" || netStatus === "error") return false;
  return cardDisabledSinceVisitVisible(
    alertStateMap[profileId],
    "active",
    scanKindMap[profileId],
    resolverConfirmedMap[profileId] === true
  );
}

/** Approach 1: re-apply carries last poll statusMap snapshot. */
function hubWouldShowWithStatusSnapshot(profileId, lastStatusMap, maps) {
  if (!maps) return false;
  const netStatus = String(
    lastStatusMap[profileId] ?? getCachedNetworkStatus(profileId) ?? "checking"
  ).toLowerCase();
  if (netStatus === "offline" || netStatus === "error") return false;
  return cardDisabledSinceVisitVisible(
    maps.alertStateMap[profileId],
    "active",
    maps.scanKindMap[profileId],
    maps.resolverConfirmedMap[profileId] === true
  );
}

describe("fourth pass: is G1+G2 still a live false-positive path?", () => {
  /** @type {Map<string, string>} */
  let sessionStore;
  /** @type {Map<string, string>} */
  let localStore;

  beforeEach(() => {
    sessionStore = new Map();
    localStore = new Map([
      [
        "hc_wallet",
        JSON.stringify([{ id: "w1", profile_id: PROFILE, qr_id: QR, label: "Test" }]),
      ],
      ["hc_wallet_last_seen_network", JSON.stringify({ [PROFILE]: "active" })],
    ]);
    vi.stubGlobal("sessionStorage", {
      getItem: (key) => sessionStore.get(key) ?? null,
      setItem: (key, value) => sessionStore.set(key, String(value)),
      removeItem: (key) => sessionStore.delete(key),
      clear: () => sessionStore.clear(),
    });
    vi.stubGlobal("localStorage", {
      getItem: (key) => localStore.get(key) ?? null,
      setItem: (key, value) => localStore.set(key, String(value)),
      removeItem: (key) => localStore.delete(key),
      clear: () => localStore.clear(),
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    setResolverHealthStatusForSinceVisit("ok");
    setLiveControlPollHealth("ok");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          scan: {
            kind: "card_revoked",
            card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
          },
        }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("G1 repro: empty statusMap + stale session active + stale latestResolved shows banner", async () => {
    await refreshWalletNetworkStatuses([{ profile_id: PROFILE, qr_id: QR }]);
    const maps = buildResolverConfirmedWalletPollMaps();
    expect(maps?.scanKindMap[PROFILE]).toBe("card_revoked");

    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE]: {
          status: "active",
          scanKind: "card_revoked",
          at: now,
        },
      })
    );

    expect(
      hubWouldShowSinceVisitBanner(PROFILE, {}, maps.alertStateMap, maps.scanKindMap, maps.resolverConfirmedMap)
    ).toBe(true);
  });

  it("second-pass still clears inbox after offline poll (contradicts old doc § stale latestResolved)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          scan: {
            kind: "card_revoked",
            card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
          },
        }),
      } as Response)
      .mockRejectedValueOnce(new Error("offline"));

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE, qr_id: QR }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toHaveLength(1);

    await refreshWalletNetworkStatuses([{ profile_id: PROFILE, qr_id: QR }]);
    expect(gatherCardDisabledSinceVisitForInbox()).toEqual([]);
    expect(buildResolverConfirmedWalletPollMaps()).toBeNull();
  });

  it("null scanKind never shows banner (contradicts old doc scanKind-null + confirmed)", () => {
    expect(
      cardDisabledSinceVisitVisible(CARD_REVOKED_ALERT_STATE, "active", null, true)
    ).toBe(false);
  });
});

describe("fix approach invariants (mechanism verification)", () => {
  /** @type {Map<string, string>} */
  let sessionStore;

  beforeEach(() => {
    sessionStore = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (key) => sessionStore.get(key) ?? null,
      setItem: (key, value) => sessionStore.set(key, String(value)),
      removeItem: (key) => sessionStore.delete(key),
      clear: () => sessionStore.clear(),
    });
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          [PROFILE]: "active",
          hc_wallet: JSON.stringify([{ profile_id: PROFILE, qr_id: QR }]),
        }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Approach 1: last statusMap snapshot with offline hides despite stale latestResolved", () => {
    const maps = {
      alertStateMap: { [PROFILE]: CARD_REVOKED_ALERT_STATE },
      scanKindMap: { [PROFILE]: "card_revoked" },
      resolverConfirmedMap: { [PROFILE]: true },
    };
    const lastStatusMap = { [PROFILE]: "offline" };
    expect(hubWouldShowWithStatusSnapshot(PROFILE, lastStatusMap, maps)).toBe(false);
  });

  it("Approach 4 (shipped): per-row gate hides when cache is offline", () => {
    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE]: { status: "offline", scanKind: null, at: now },
      })
    );
    expect(shouldSuppressCardDisabledSinceVisitForProfile(PROFILE)).toBe(true);
  });

  it("A1+A4 (shipped): status snapshot offline hides even if G1 empty-map path would show", () => {
    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE]: { status: "active", scanKind: "card_revoked", at: now },
      })
    );
    const maps = {
      alertStateMap: { [PROFILE]: CARD_REVOKED_ALERT_STATE },
      scanKindMap: { [PROFILE]: "card_revoked" },
      resolverConfirmedMap: { [PROFILE]: true },
    };
    const lastStatusMap = { [PROFILE]: "offline" };
    expect(hubWouldShowWithStatusSnapshot(PROFILE, lastStatusMap, maps)).toBe(false);
    expect(
      hubWouldShowSinceVisitBanner(PROFILE, {}, maps.alertStateMap, maps.scanKindMap, maps.resolverConfirmedMap)
    ).toBe(true);
  });

  it("Approach 5 (global gate): degraded health suppresses gather path", () => {
    setResolverHealthStatusForSinceVisit("degraded");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });
});

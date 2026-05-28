/**
 * Fourth pass: reproduce G1 split-brain preconditions and verify fix-approach invariants.
 * @see docs/CARD_DISABLED_SINCE_VISIT_FALSE_POSITIVE_INVESTIGATION.md § Fourth pass
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { resolverJsonResponse } from "./helpers/resolver-fetch-response.mjs";
import { resetWalletNetworkTruth } from "../../site/js/device-wallet-network-truth.mjs";

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
  if (netStatus === "checking" || netStatus === "offline" || netStatus === "error") {
    return false;
  }
  if (netStatus === "active") {
    return false;
  }
  return cardDisabledSinceVisitVisible(
    alertStateMap[profileId],
    "active",
    scanKindMap[profileId],
    resolverConfirmedMap[profileId] === true
  );
}

/** Mirrors applyRevokedSinceVisitAlerts allowShow (A5): hide-only never sets visible. */
function hubBannerVisibleAfterApply(show, allowShow) {
  return Boolean(show && allowShow);
}

/** Approach 1: re-apply carries last poll statusMap snapshot. */
function hubWouldShowWithStatusSnapshot(profileId, lastStatusMap, maps) {
  if (!maps) return false;
  const netStatus = String(
    lastStatusMap[profileId] ?? getCachedNetworkStatus(profileId) ?? "checking"
  ).toLowerCase();
  if (netStatus === "checking" || netStatus === "offline" || netStatus === "error") {
    return false;
  }
  if (netStatus === "active") {
    return false;
  }
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
    resetWalletNetworkTruth();
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
      vi.fn(async () =>
        resolverJsonResponse({
          scan: {
            kind: "card_revoked",
            card: { status: "revoked", handle: "e2e", manifesto_line: "Test" },
          },
        })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("G1 closed: active cache chip hides banner despite stale poll maps on empty statusMap", async () => {
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
    ).toBe(false);
  });

  it("second-pass still clears inbox after offline poll (contradicts old doc § stale latestResolved)", async () => {
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

  it("A3: checking chip hides banner even when poll maps say card_revoked", () => {
    const maps = {
      alertStateMap: { [PROFILE]: CARD_REVOKED_ALERT_STATE },
      scanKindMap: { [PROFILE]: "card_revoked" },
      resolverConfirmedMap: { [PROFILE]: true },
    };
    expect(
      hubWouldShowSinceVisitBanner(PROFILE, { [PROFILE]: "checking" }, maps.alertStateMap, maps.scanKindMap, maps.resolverConfirmedMap)
    ).toBe(false);
  });

  it("A1+A4 (shipped): status snapshot offline hides; active cache chip blocks empty-map G1 re-apply", () => {
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
    ).toBe(false);
  });

  it("Approach 5 (global gate): degraded health suppresses gather path", () => {
    setResolverHealthStatusForSinceVisit("degraded");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });

  it("Approach 5 (shipped): hide-only re-apply does not show from stale maps", () => {
    const maps = {
      alertStateMap: { [PROFILE]: CARD_REVOKED_ALERT_STATE },
      scanKindMap: { [PROFILE]: "card_revoked" },
      resolverConfirmedMap: { [PROFILE]: true },
    };
    const show = cardDisabledSinceVisitVisible(
      maps.alertStateMap[PROFILE],
      "active",
      maps.scanKindMap[PROFILE],
      true
    );
    expect(show).toBe(true);
    expect(hubBannerVisibleAfterApply(show, false)).toBe(false);
  });
});

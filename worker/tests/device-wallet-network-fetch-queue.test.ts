import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getCardStatusUrl: (profileId, qrId) =>
    `https://example.test/.well-known/hc/v1/cards/${profileId}/status?q=${qrId}`,
}));

import {
  RESOLVER_HEALTH_UNSET,
  walletNetworkFetchAllowedByResolverHealth,
} from "../../site/js/device-wallet-since-visit-gate-core.mjs";
import {
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromPoll,
} from "../../site/js/device-wallet-network-truth.mjs";
import { listWalletEntriesNeedingNetworkFetch } from "../../site/js/device-wallet-network.mjs";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_A = "qr_E2eWakketTest9";

describe("walletNetworkFetchAllowedByResolverHealth (P1-MOTO-06)", () => {
  it("allows fetch when health is ok or unset", () => {
    expect(walletNetworkFetchAllowedByResolverHealth("ok")).toBe(true);
    expect(walletNetworkFetchAllowedByResolverHealth(RESOLVER_HEALTH_UNSET)).toBe(
      true
    );
    expect(walletNetworkFetchAllowedByResolverHealth("degraded")).toBe(false);
    expect(walletNetworkFetchAllowedByResolverHealth("offline")).toBe(false);
  });
});

describe("listWalletEntriesNeedingNetworkFetch (P1-MOTO-06)", () => {
  /** @type {Map<string, string>} */
  let sessionStore;

  beforeEach(() => {
    resetWalletNetworkTruth();
    sessionStore = new Map();
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
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetWalletNetworkTruth();
  });

  it("includes profiles with fresh cache but no resolver-confirmed poll this visit", () => {
    const now = Date.now();
    sessionStore.set(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE_A]: {
          status: "active",
          scanKind: "active",
          at: now,
        },
      })
    );
    const entries = [{ profile_id: PROFILE_A, qr_id: QR_A }];
    expect(listWalletEntriesNeedingNetworkFetch(entries, now)).toEqual(entries);
  });

  it("skips profiles with fresh cache after resolver-confirmed poll", () => {
    const now = Date.now();
    sessionStorage.setItem(
      "hc_wallet_network_cache",
      JSON.stringify({
        [PROFILE_A]: {
          status: "active",
          scanKind: "active",
          at: now,
        },
      })
    );
    const entries = [{ profile_id: PROFILE_A, qr_id: QR_A }];
    setWalletNetworkTruthFromPoll(PROFILE_A, {
      status: "active",
      scanKind: "active",
      alertState: "active",
    });
    expect(listWalletEntriesNeedingNetworkFetch(entries, now)).toEqual([]);
  });
});

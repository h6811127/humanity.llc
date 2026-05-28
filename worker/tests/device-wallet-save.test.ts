import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verificationRecordFromLabelState } from "../../site/js/device-wallet-network-core.mjs";
import {
  loadWalletSummary,
  mergeWalletEntryFromSession,
  resetWalletCachesForTests,
  saveWallet,
} from "../../site/js/device-wallet.mjs";

let localStore: Map<string, string>;

beforeEach(() => {
  localStore = new Map();
  resetWalletCachesForTests();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => localStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStore.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      localStore.delete(key);
    }),
  });
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("Event", class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetWalletCachesForTests();
});

describe("verificationRecordFromLabelState", () => {
  it("maps Steward label to steward state for the status dot", () => {
    expect(
      verificationRecordFromLabelState("Steward", "verified_human")
    ).toEqual({ label: "Steward", state: "steward" });
  });
});

describe("mergeWalletEntryFromSession", () => {
  it("updates verification when session becomes steward", () => {
    const existing = {
      profile_id: "p1",
      label: "Card",
      owner_private_key_b58: "priv",
      verification: { state: "verified_human", label: "Vouched Human" },
    };
    const session = {
      profile_id: "p1",
      owner_private_key_b58: "priv",
      verification: { state: "steward", label: "Steward" },
    };
    const merged = mergeWalletEntryFromSession(existing, session);
    expect(merged.verification).toEqual({ state: "steward", label: "Steward" });
  });

  it("keeps existing verification when session omits it", () => {
    const existing = {
      profile_id: "p1",
      label: "Card",
      owner_private_key_b58: "priv",
      verification: { state: "steward", label: "Steward" },
    };
    const session = {
      profile_id: "p1",
      owner_private_key_b58: "priv",
    };
    const merged = mergeWalletEntryFromSession(existing, session);
    expect(merged.verification).toEqual({ state: "steward", label: "Steward" });
  });
});

describe("loadWalletSummary", () => {
  it("stores count, signing-key, steward, and pollable-card metadata", () => {
    saveWallet([
      {
        profile_id: "p1",
        qr_id: "qr_xBZTq7M27tueCzBY",
        owner_private_key_b58: "priv",
        verification: { state: "steward", label: "Steward" },
      },
      {
        profile_id: "p2",
        scan_url: "https://humanity.llc/c/p2?q=qr_Abcdefghijkmnop",
      },
      { label: "missing profile" },
    ]);

    expect(loadWalletSummary()).toMatchObject({
      count: 3,
      profileIds: ["p1", "p2"],
      signingKeyCount: 1,
      pollableCount: 2,
      stewardReady: true,
    });
    expect(localStore.get("hc_wallet_summary")).toContain('"count":3');
  });

  it("uses a valid persisted summary without parsing key-bearing wallet JSON", () => {
    saveWallet([
      {
        profile_id: "p1",
        qr_id: "qr_xBZTq7M27tueCzBY",
        owner_private_key_b58: "priv",
      },
    ]);
    resetWalletCachesForTests();

    const realParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, "parse").mockImplementation((value) => {
      if (String(value).trim().startsWith("[")) {
        throw new Error("wallet JSON should not be parsed");
      }
      return realParse(value);
    });

    expect(loadWalletSummary()).toMatchObject({
      count: 1,
      profileIds: ["p1"],
      signingKeyCount: 1,
      pollableCount: 1,
    });
    expect(parseSpy).toHaveBeenCalledTimes(1);
  });
});

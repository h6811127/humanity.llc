import { describe, expect, it } from "vitest";

import {
  walletHasStoredEntries,
  walletStorageFingerprint,
  walletSummaryIntegrityNeedsRepair,
} from "../../site/js/device-wallet-summary-integrity-core.mjs";
import { WALLET_SUMMARY_VERSION } from "../../site/js/device-wallet-summary-core.mjs";

const walletRaw = JSON.stringify([{ profile_id: "p1", handle: "demo" }]);

describe("walletStorageFingerprint (RC-15)", () => {
  it("returns stable fingerprint for same bytes", () => {
    expect(walletStorageFingerprint(walletRaw)).toBe(walletStorageFingerprint(walletRaw));
    expect(walletStorageFingerprint(null)).toBe("0:0");
    expect(walletStorageFingerprint("[]")).not.toBe("0:0");
  });
});

describe("walletSummaryIntegrityNeedsRepair (RC-15)", () => {
  it("requires repair when summary missing but wallet has rows", () => {
    expect(
      walletSummaryIntegrityNeedsRepair({
        walletRaw,
        storedSummary: null,
      })
    ).toBe(true);
  });

  it("requires repair on fingerprint mismatch", () => {
    expect(
      walletSummaryIntegrityNeedsRepair({
        walletRaw,
        storedSummary: {
          version: WALLET_SUMMARY_VERSION,
          walletFingerprint: "wrong",
          count: 1,
          profileIds: ["p1"],
          signingKeyCount: 0,
          pollableCount: 0,
          stewardReady: false,
          rows: [{ profile_id: "p1" }],
        },
      })
    ).toBe(true);
  });

  it("requires repair when wallet has rows but summary count is zero", () => {
    const fingerprint = walletStorageFingerprint(walletRaw);
    expect(
      walletSummaryIntegrityNeedsRepair({
        walletRaw,
        storedSummary: {
          version: WALLET_SUMMARY_VERSION,
          walletFingerprint: fingerprint,
          count: 0,
          profileIds: [],
          signingKeyCount: 0,
          pollableCount: 0,
          stewardReady: false,
          rows: [],
        },
      })
    ).toBe(true);
  });

  it("passes when fingerprint and counts align", () => {
    const fingerprint = walletStorageFingerprint(walletRaw);
    expect(
      walletSummaryIntegrityNeedsRepair({
        walletRaw,
        storedSummary: {
          version: WALLET_SUMMARY_VERSION,
          walletFingerprint: fingerprint,
          count: 1,
          profileIds: ["p1"],
          signingKeyCount: 0,
          pollableCount: 0,
          stewardReady: false,
          rows: [{ profile_id: "p1" }],
        },
      })
    ).toBe(false);
  });

  it("requires repair when wallet empty but summary still has rows", () => {
    expect(
      walletSummaryIntegrityNeedsRepair({
        walletRaw: "[]",
        storedSummary: {
          version: WALLET_SUMMARY_VERSION,
          walletFingerprint: walletStorageFingerprint("[]"),
          count: 1,
          profileIds: ["p1"],
          signingKeyCount: 0,
          pollableCount: 0,
          stewardReady: false,
          rows: [{ profile_id: "p1" }],
        },
      })
    ).toBe(true);
  });
});

describe("walletHasStoredEntries (RC-15)", () => {
  it("detects non-empty wallet JSON", () => {
    expect(walletHasStoredEntries("[]")).toBe(false);
    expect(walletHasStoredEntries(walletRaw)).toBe(true);
  });
});

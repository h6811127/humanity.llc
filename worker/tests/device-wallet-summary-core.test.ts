import { describe, expect, it } from "vitest";

import {
  WALLET_SUMMARY_FORBIDDEN_JSON_SUBSTRINGS,
  WALLET_SUMMARY_ROW_ALLOWED_KEYS,
  assertWalletSummaryRowKeys,
  buildWalletSummary,
  serializeWalletSummaryForStorage,
  shouldUsePersistedWalletSummaryFastPath,
  walletSummaryRowFromEntry,
} from "../../site/js/device-wallet-summary-core.mjs";

const QR = "qr_xBZTq7M27tueCzBY";

function resolveQrId(entry: { qr_id?: string | null; scan_url?: string | null } | null | undefined) {
  const direct = typeof entry?.qr_id === "string" ? entry.qr_id.trim() : "";
  return direct || null;
}

describe("device-wallet-summary-core (P3-3)", () => {
  it("skips persisted summary fast path until wallet reconciled (RC-5)", () => {
    expect(shouldUsePersistedWalletSummaryFastPath(false)).toBe(false);
    expect(shouldUsePersistedWalletSummaryFastPath(true)).toBe(true);
  });

  it("allows only display-safe row keys", () => {
    expect([...WALLET_SUMMARY_ROW_ALLOWED_KEYS].sort()).toEqual([
      "handle",
      "id",
      "label",
      "profile_id",
      "qr_id",
      "qr_scope",
      "scan_url",
    ]);
  });

  it("walletSummaryRowFromEntry omits signing key fields", () => {
    const row = walletSummaryRowFromEntry(
      {
        id: "a",
        profile_id: "profile-a",
        label: "Card",
        owner_private_key_b58: "must-not-appear",
        recovery_private_key_b58: "also-forbidden",
      },
      resolveQrId
    );
    expect(row).toMatchObject({
      id: "a",
      profile_id: "profile-a",
      label: "Card",
    });
    expect(row).not.toHaveProperty("owner_private_key_b58");
    expect(row).not.toHaveProperty("recovery_private_key_b58");
    assertWalletSummaryRowKeys(row!);
  });

  it("buildWalletSummary tripwires before persist", () => {
    const summary = buildWalletSummary(
      [
        {
          profile_id: "p1",
          qr_id: QR,
          owner_private_key_b58: "privkey-material",
          verification: { state: "steward", label: "Steward" },
        },
      ],
      "10:abc",
      resolveQrId
    );
    expect(summary.signingKeyCount).toBe(1);
    expect(summary.rows[0]).not.toHaveProperty("owner_private_key_b58");
    const json = serializeWalletSummaryForStorage(summary);
    for (const forbidden of WALLET_SUMMARY_FORBIDDEN_JSON_SUBSTRINGS) {
      expect(json.includes(forbidden)).toBe(false);
    }
    expect(json).not.toContain("privkey-material");
  });

  it("rejects summary rows with forbidden key names", () => {
    expect(() =>
      assertWalletSummaryRowKeys({
        profile_id: "p1",
        owner_private_key_b58: "x",
      } as { profile_id: string; owner_private_key_b58: string })
    ).toThrow(/forbidden key/i);
  });
});

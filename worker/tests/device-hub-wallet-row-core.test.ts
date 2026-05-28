import { describe, expect, it } from "vitest";

import {
  hubEntryFromSummaryRow,
  hubRowHasSigningKeys,
  networkPollEntryFromSummaryRow,
  walletHaystackFromSummaryRow,
} from "../../site/js/device-hub-wallet-row-core.mjs";

describe("device-hub-wallet-row-core", () => {
  const row = {
    id: "p1_123",
    profile_id: "p1",
    label: "River",
    handle: "river",
    qr_id: "qr_xBZTq7M27tueCzBY",
    scan_url: "https://humanity.llc/c/p1?q=qr_xBZTq7M27tueCzBY",
    hasSigningKeys: true,
    manifesto_line: "Open studio",
    pilot_template: "general",
    saved_at: "2026-05-16T17:00:00.000Z",
  };

  it("maps summary rows to hub entry shapes without private keys", () => {
    expect(hubEntryFromSummaryRow(row)).toMatchObject({
      id: "p1_123",
      profile_id: "p1",
      hasSigningKeys: true,
      manifesto_line: "Open studio",
    });
    expect(hubEntryFromSummaryRow(row)).not.toHaveProperty("owner_private_key_b58");
  });

  it("detects signing keys from summary or hydrated entries", () => {
    expect(hubRowHasSigningKeys(hubEntryFromSummaryRow(row))).toBe(true);
    expect(
      hubRowHasSigningKeys({ profile_id: "p2", owner_private_key_b58: "priv" })
    ).toBe(true);
    expect(hubRowHasSigningKeys({ profile_id: "p3" })).toBe(false);
  });

  it("builds search haystack and network poll entries from summary rows", () => {
    expect(walletHaystackFromSummaryRow(row)).toContain("open studio");
    expect(networkPollEntryFromSummaryRow(row)).toEqual({
      profile_id: "p1",
      qr_id: "qr_xBZTq7M27tueCzBY",
      scan_url: row.scan_url,
      id: "p1_123",
    });
  });
});

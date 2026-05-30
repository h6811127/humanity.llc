import { describe, expect, it } from "vitest";

import {
  formatHubWalletDebugCopyBlock,
  formatHubWalletDebugHubLine,
  gatherHubWalletDebugSnapshot,
  suggestHubDisappearanceRcs,
} from "../../site/js/device-hub-wallet-debug-core.mjs";

describe("gatherHubWalletDebugSnapshot (hub card monitoring)", () => {
  it("matches steward diagnostic shape for empty wallet", () => {
    const snapshot = gatherHubWalletDebugSnapshot({
      walletRaw: null,
      summaryRaw: null,
      createdRaw: null,
      persistFlag: "1",
      standalone: false,
      origin: "https://humanity.llc",
    });
    expect(snapshot.walletParse).toBe("ok");
    expect(snapshot.walletBytes).toBe(0);
    expect(snapshot.walletCount).toBeNull();
    expect(snapshot.profiles).toBeNull();
  });

  it("flags corrupt parse and profiles with keys", () => {
    const wallet = JSON.stringify([
      {
        profile_id: "p1",
        handle: "steward",
        owner_private_key_b58: "priv",
        saved_at: "2026-05-30T00:00:00.000Z",
      },
    ]);
    const snapshot = gatherHubWalletDebugSnapshot({
      walletRaw: wallet,
      summaryRaw: "{}",
      createdRaw: JSON.stringify({ owner_private_key_b58: "priv" }),
      persistFlag: "0",
      standalone: true,
      origin: "https://humanity.llc",
    });
    expect(snapshot.walletCount).toBe(1);
    expect(snapshot.profiles?.[0]?.hasKey).toBe(true);
    expect(snapshot.sessionHasKey).toBe(true);
    expect(suggestHubDisappearanceRcs(snapshot)).toEqual(
      expect.arrayContaining(["RC-14", "RC-2"])
    );
  });
});

describe("formatHubWalletDebugCopyBlock", () => {
  it("includes likely RC hints for wiped wallet", () => {
    const snapshot = gatherHubWalletDebugSnapshot({ walletRaw: null, origin: "https://humanity.llc" });
    const block = formatHubWalletDebugCopyBlock(snapshot);
    expect(block).toMatch(/likelyRc=RC-3/);
    expect(formatHubWalletDebugHubLine(snapshot)).toMatch(/Wallet debug/);
  });
});

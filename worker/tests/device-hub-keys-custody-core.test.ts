import { describe, expect, it } from "vitest";

import {
  buildHubKeysCustodyPanel,
  labelForHubKeysCustodyEntry,
} from "../../site/js/device-hub-keys-custody-core.mjs";

describe("buildHubKeysCustodyPanel", () => {
  it("shows one row per cross-tab entry instead of aggregate", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      crossTabEntries: [
        { profile_id: "abc", tabId: "t1", handle: "alice" },
        { profile_id: "def", tabId: "t2", label: "Demo card" },
      ],
    });
    expect(state.rows.filter((r) => r.kind === "cross_tab")).toHaveLength(2);
    expect(state.rows.some((r) => r.kind === "cross_tab_summary")).toBe(true);
    expect(state.rows.find((r) => r.kind === "cross_tab_summary")?.title).toBe(
      "Managing in 2 other tabs"
    );
    expect(state.rows.filter((r) => r.kind === "cross_tab")[0].title).toBe("@alice");
    expect(state.visible).toBe(true);
    expect(state.showEducation).toBe(false);
  });

  it("shows unsaved this-tab row when tab notice is active", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 1,
      hasActiveKeys: true,
      tabSessionLabel: "@bob",
      crossTabEntries: [{ profile_id: "abc", tabId: "t1" }],
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["this_tab_unsaved"]);
    expect(state.rows[0].subtitle).toContain("@bob");
  });

  it("shows active this-tab row when keys loaded and saved", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      hasActiveKeys: true,
      tabSessionLabel: "@steward",
    });
    expect(state.rows).toEqual([
      {
        kind: "this_tab_active",
        title: "You can manage objects here",
        subtitle: "@steward",
      },
    ]);
  });

  it("shows PWA session mismatch row instead of wallet-not-in-tab when shell modes differ (P2-2)", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      hasActiveKeys: false,
      walletEntriesWithKeys: 1,
      educationDismissed: true,
      pwaSessionMismatchTitle: "Ownership was last active in Safari",
      pwaSessionMismatchDetail: "Restore control in this app.",
      pwaSessionMismatchCanRestore: true,
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["pwa_session_mismatch"]);
    expect(state.rows[0].canRestoreInThisTab).toBe(true);
  });

  it("shows wallet-not-in-tab restore row when saved keys exist but tab is empty (P1-2)", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 0,
      hasActiveKeys: false,
      walletEntriesWithKeys: 1,
      educationDismissed: true,
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["wallet_not_in_tab"]);
    expect(state.rows[0].title).toBe("Ownership not in this tab — tap to restore");
    expect(state.visible).toBe(true);
  });

  it("shows orphan rows per tab and suppresses cross-tab when tab unsaved", () => {
    const state = buildHubKeysCustodyPanel({
      tabNoticeCount: 1,
      hasActiveKeys: true,
      orphanRemovedEntries: [
        { profile_id: "old1", tabId: "t1", label: "Removed A" },
        { profile_id: "old2", tabId: "t2", label: "Removed B" },
      ],
      crossTabEntries: [{ profile_id: "x", tabId: "t3" }],
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["this_tab_unsaved"]);
  });

  it("shows education when idle and not dismissed", () => {
    const state = buildHubKeysCustodyPanel({
      educationDismissed: false,
    });
    expect(state.rows).toEqual([]);
    expect(state.showEducation).toBe(true);
    expect(state.visible).toBe(true);
  });

  it("hides panel when nothing to show", () => {
    expect(
      buildHubKeysCustodyPanel({
        educationDismissed: true,
      }).visible
    ).toBe(false);
  });

  it("shows default vouch row when auto-activate is enabled", () => {
    const state = buildHubKeysCustodyPanel({
      defaultVouchProfileId: "abc123",
      defaultVouchLabel: "@steward",
      vouchAutoActivate: true,
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["vouch_default"]);
    expect(state.rows[0].title).toBe("Default for attestation on scan");
    expect(state.rows[0].subtitle).toBe("@steward");
    expect(state.visible).toBe(true);
  });

  it("shows sign lock row when keys are active with PIN lock", () => {
    const state = buildHubKeysCustodyPanel({
      hasActiveKeys: true,
      tabSessionLabel: "@alice",
      signLockMode: "pin",
      signLockLabel: "@alice",
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["this_tab_active", "sign_lock"]);
    expect(state.rows[1].title).toContain("PIN");
  });

  it("shows pwa session mismatch before wallet-not-in-tab (P2-2)", () => {
    const state = buildHubKeysCustodyPanel({
      walletEntriesWithKeys: 1,
      educationDismissed: true,
      pwaSessionMismatchTitle: "Ownership was last active in Safari",
      pwaSessionMismatchDetail: "Restore control in this app.",
      pwaSessionMismatchCanRestore: true,
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["pwa_session_mismatch"]);
    expect(state.rows[0].canRestoreInThisTab).toBe(true);
  });

  it("prefers wallet-not-in-tab over vouch nudge when tab empty (P1-2)", () => {
    const state = buildHubKeysCustodyPanel({
      walletEntriesWithKeys: 3,
      educationDismissed: true,
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["wallet_not_in_tab"]);
    expect(state.rows.some((r) => r.kind === "vouch_nudge")).toBe(false);
  });

  it("suppresses vouch nudge when cross-tab notice is active", () => {
    const state = buildHubKeysCustodyPanel({
      walletEntriesWithKeys: 2,
      crossTabEntries: [{ profile_id: "x", tabId: "t1" }],
    });
    expect(state.rows.some((r) => r.kind === "vouch_nudge")).toBe(false);
    expect(state.rows.some((r) => r.kind === "cross_tab")).toBe(true);
  });

  it("adds summary row when multiple cross-tab entries", () => {
    const state = buildHubKeysCustodyPanel({
      crossTabEntries: [
        { profile_id: "abc", tabId: "t1", handle: "alice" },
        { profile_id: "def", tabId: "t2", handle: "bob" },
      ],
    });
    expect(state.rows.map((r) => r.kind)).toEqual([
      "cross_tab_summary",
      "cross_tab",
      "cross_tab",
    ]);
    expect(state.rows[0].title).toBe("Managing in 2 other tabs");
    expect(state.rows[0].subtitle).toContain("@alice");
    expect(state.rows[1].title).toBe("@alice");
    expect(state.rows[1].subtitle).toBe("Managing in 1 other tab");
  });

  it("uses Safari/window copy for cross-tab rows in standalone", () => {
    const state = buildHubKeysCustodyPanel({
      standalone: true,
      crossTabEntries: [
        { profile_id: "abc", tabId: "t1", handle: "alice" },
        { profile_id: "def", tabId: "t2", handle: "bob" },
      ],
    });
    expect(state.rows[0].title).toBe("Managing in 2 other windows");
    expect(state.rows[1].subtitle).toBe("Managing in Safari");
  });

  it("shows wallet scale row when above comfortable card count", () => {
    const state = buildHubKeysCustodyPanel({
      savedCardCount: 7,
      walletScaleTitle: "Many saved cards",
      walletScaleHint: "7 saved — comfortable use is about 1–5 cards.",
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["wallet_scale"]);
    expect(state.visible).toBe(true);
  });

  it("omits wallet scale row without hint text", () => {
    const state = buildHubKeysCustodyPanel({
      savedCardCount: 3,
      walletScaleTitle: "",
      walletScaleHint: null,
    });
    expect(state.rows.some((r) => r.kind === "wallet_scale")).toBe(false);
  });

  it("can show wallet scale alongside cross-tab custody rows", () => {
    const state = buildHubKeysCustodyPanel({
      savedCardCount: 8,
      walletScaleTitle: "Many saved cards",
      walletScaleHint: "8 saved — comfortable use is about 1–5 cards.",
      crossTabEntries: [{ profile_id: "abc", tabId: "t1", handle: "alice" }],
    });
    expect(state.rows.map((r) => r.kind)).toEqual(["cross_tab", "wallet_scale"]);
  });
});

describe("labelForHubKeysCustodyEntry", () => {
  it("prefers label, then handle, then profile prefix", () => {
    expect(labelForHubKeysCustodyEntry({ profile_id: "abc", tabId: "t", label: "My card" })).toBe(
      "My card"
    );
    expect(labelForHubKeysCustodyEntry({ profile_id: "abc", tabId: "t", handle: "alice" })).toBe(
      "@alice"
    );
    expect(labelForHubKeysCustodyEntry({ profile_id: "abcdefghijklmnop", tabId: "t" })).toBe(
      "abcdefghijkl…"
    );
  });
});

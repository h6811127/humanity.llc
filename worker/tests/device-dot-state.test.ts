import { describe, expect, it } from "vitest";

import {
  describeDotState,
  deviceStateFromContext,
  dotClassList,
  dotExplainerKicker,
  dotOverlayFromCounts,
  dotPageKindFromPathname,
  dotStateKey,
  hasStewardVerification,
  hubStatusLineItemsFromSegments,
  inboxOverlayQuickAction,
  overlayAriaText,
  primaryDotTone,
  shellChromeStatusLineFromSegments,
  shellDotUsesNeutralEmptyWallet,
  shellStatusLinePrimaryInChrome,
  SHELL_DOT_NEUTRAL_EMPTY_CLASS,
  shouldCelebrateStewardTransition,
  dotTransitionKey,
  statusAriaLabel,
  scanDeviceStateFromContext,
  scanOverlayQuickAction,
  scanWalletKeysNotInTab,
} from "../../site/js/device-dot-state-core.mjs";

describe("hasStewardVerification", () => {
  it("accepts steward state or label", () => {
    expect(hasStewardVerification({ verification: { state: "steward" } })).toBe(true);
    expect(hasStewardVerification({ verification: { label: "Steward" } })).toBe(true);
    expect(hasStewardVerification({ verification: { state: "verified_human" } })).toBe(
      false
    );
    expect(hasStewardVerification(null)).toBe(false);
  });
});

describe("deviceStateFromContext", () => {
  it("prioritizes unsaved over steward and saved keys", () => {
    expect(
      deviceStateFromContext({
        unsavedTabKeys: true,
        stewardReady: true,
        savedWalletCount: 2,
      })
    ).toBe("unsaved");
    expect(
      deviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: true,
        savedWalletCount: 2,
      })
    ).toBe("steward");
    expect(
      deviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: false,
        savedWalletCount: 1,
      })
    ).toBe("keys");
    expect(
      deviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: false,
        savedWalletCount: 0,
      })
    ).toBe("none");
  });
});

describe("scanDeviceStateFromContext", () => {
  it("uses tab signing keys, not wallet row count (P0-5)", () => {
    expect(
      scanDeviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: true,
        hasTabSigningKeys: false,
      })
    ).toBe("none");
    expect(
      scanDeviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: true,
        hasTabSigningKeys: true,
      })
    ).toBe("steward");
    expect(
      scanDeviceStateFromContext({
        unsavedTabKeys: false,
        stewardReady: false,
        hasTabSigningKeys: true,
      })
    ).toBe("keys");
  });
});

describe("scanWalletKeysNotInTab", () => {
  it("is true when wallet has signing rows but tab does not", () => {
    expect(scanWalletKeysNotInTab(1, false)).toBe(true);
    expect(scanWalletKeysNotInTab(1, true)).toBe(false);
    expect(scanWalletKeysNotInTab(0, false)).toBe(false);
  });
});

describe("dotOverlayFromCounts", () => {
  it("prioritizes proof waiting over cross-tab keys", () => {
    expect(dotOverlayFromCounts({ liveProofPending: 2, crossTabNotice: 1 })).toBe(
      "proof_waiting"
    );
    expect(dotOverlayFromCounts({ liveProofPending: 0, crossTabNotice: 1 })).toBe(
      "cross_tab_keys"
    );
    expect(dotOverlayFromCounts({ liveProofPending: 0, crossTabNotice: 0 })).toBe("none");
  });

  it("shows card-disabled overlay only when higher overlays are absent", () => {
    expect(
      dotOverlayFromCounts({
        liveProofPending: 0,
        crossTabNotice: 0,
        cardDisabledSinceVisit: 2,
      })
    ).toBe("card_disabled_since_visit");
    expect(
      dotOverlayFromCounts({
        liveProofPending: 0,
        crossTabNotice: 1,
        cardDisabledSinceVisit: 2,
      })
    ).toBe("cross_tab_keys");
  });
});

describe("statusAriaLabel", () => {
  it("includes overlay text when present", () => {
    expect(statusAriaLabel("ok", "steward", "proof_waiting")).toBe(
      "Status: resolver online, steward control ready, live proof waiting."
    );
    expect(statusAriaLabel("ok", "keys", "none")).toBe(
      "Status: resolver online, ownership saved on device."
    );
  });

  it("uses Your device prefix on scan pages", () => {
    expect(statusAriaLabel("ok", "none", "cross_tab_keys", { pageKind: "scan" })).toBe(
      "Your device: resolver online, ownership not loaded in this tab, managing in another tab."
    );
  });
});

describe("overlayAriaText", () => {
  it("maps overlay ids to phrases", () => {
    expect(overlayAriaText("proof_waiting")).toBe("live proof waiting");
    expect(overlayAriaText("cross_tab_keys")).toBe("managing in another tab");
    expect(overlayAriaText("cross_tab_keys", "standalone")).toBe("managing in Safari");
    expect(overlayAriaText("card_disabled_since_visit")).toBe(
      "card disabled since last visit"
    );
    expect(overlayAriaText("none")).toBe("");
  });
});

describe("describeDotState", () => {
  it("uses network state over steward device state", () => {
    const degraded = describeDotState("degraded", "steward", "none", {
      stewardReady: true,
    });
    expect(degraded.id).toBe("degraded");
    expect(degraded.why).toContain("Steward control is ready locally");

    const offline = describeDotState("offline", "steward", "none", {
      stewardReady: true,
    });
    expect(offline.id).toBe("offline");
  });

  it("uses readiness-focused next copy on wallet", () => {
    const steward = describeDotState("ok", "steward", "none", {
      stewardReady: true,
      pageKind: "wallet",
    });
    expect(steward.next).toContain("ready on this device");
    expect(steward.next).not.toContain("Open steward review queue");
  });

  it("prioritizes vouch guidance over steward queue when url is available", () => {
    const steward = describeDotState("ok", "steward", "none", {
      stewardReady: true,
      queueUrl: "/operator/vouch-audit.html",
    });
    expect(steward.id).toBe("steward");
    expect(steward.next).toContain("Scan someone else's QR to vouch");
    expect(steward.action).toEqual({
      kind: "open_controls",
      label: "Open controls",
    });
  });

  it("routes proof overlay to open notifications", () => {
    const withProof = describeDotState("ok", "keys", "proof_waiting");
    expect(withProof.next).toContain("Live proof");
    expect(withProof.action).toEqual({
      kind: "open_notifications",
      label: "Open proof requests",
    });
  });

  it("routes proof overlay to scan live-proof scroll on scan pages", () => {
    const withProof = describeDotState("ok", "keys", "proof_waiting", {
      pageKind: "scan",
    });
    expect(withProof.action).toEqual(scanOverlayQuickAction("proof_waiting"));
  });

  it("routes card-disabled overlay to open device inbox", () => {
    const disabled = describeDotState("ok", "keys", "card_disabled_since_visit");
    expect(disabled.next).toContain("disabled on the network");
    expect(inboxOverlayQuickAction("card_disabled_since_visit")).toEqual({
      kind: "open_notifications",
      label: "Open device inbox",
    });
    expect(disabled.action).toEqual(inboxOverlayQuickAction("card_disabled_since_visit"));
  });

  it("opens card workspace directly when one saved card has keys", () => {
    const keys = describeDotState("ok", "keys", "none", {
      singleSavedCardWithKeys: true,
      pageKind: "landing",
    });
    expect(keys.action).toEqual({
      kind: "open_card_controls",
      label: "Open controls",
    });
    expect(keys.next).toContain("Open your saved card");
  });

  it("keeps hub open_controls when multiple saved cards have keys", () => {
    const keys = describeDotState("ok", "keys", "none", {
      singleSavedCardWithKeys: false,
      pageKind: "landing",
    });
    expect(keys.action).toEqual({
      kind: "open_controls",
      label: "Open controls",
    });
  });

  it("keeps hub open_controls on wallet page even with one saved card", () => {
    const keys = describeDotState("ok", "keys", "none", {
      singleSavedCardWithKeys: true,
      pageKind: "wallet",
    });
    expect(keys.action).toEqual({
      kind: "open_controls",
      label: "Open controls",
    });
  });

  it("uses scan-specific next copy for eligible viewers", () => {
    const none = describeDotState("ok", "none", "none", { pageKind: "scan" });
    expect(none.next).toContain("Take control here");
    const steward = describeDotState("ok", "steward", "none", {
      pageKind: "scan",
      stewardReady: true,
    });
    expect(steward.next).toContain("Scroll to vouch");
  });

  it("honest scan copy when wallet has keys but tab cannot sign (P0-5)", () => {
    const savedNotInTab = describeDotState("ok", "none", "none", {
      pageKind: "scan",
      walletKeysNotInTab: true,
    });
    expect(savedNotInTab.now).toBe("Ownership not in this tab.");
    expect(savedNotInTab.why).toContain("saved on this device");
    expect(savedNotInTab.action).toEqual({
      kind: "scan_use_keys_here",
      label: "Restore control here",
    });
  });

  it("honest shell copy when wallet has keys but tab cannot sign (P1-2)", () => {
    const savedNotInTab = describeDotState("ok", "none", "none", {
      pageKind: "landing",
      walletKeysNotInTab: true,
    });
    expect(savedNotInTab.now).toBe(
      "Ownership not in this tab — tap to restore."
    );
    expect(savedNotInTab.action).toEqual({
      kind: "open_controls",
      label: "Restore control in this tab",
    });
  });
});

describe("dotExplainerKicker", () => {
  it("uses glance subtitle for compact steward state", () => {
    expect(dotExplainerKicker({ id: "steward" }, true)).toBe(
      "Steward ready: you can review and sign steward actions now."
    );
    expect(dotExplainerKicker({ id: "keys" }, true)).toBe("Status now");
  });
});

describe("statusAriaLabel wallet", () => {
  it("appends scroll hint on wallet page", () => {
    const label = statusAriaLabel("ok", "steward", "none", { pageKind: "wallet" });
    expect(label).toMatch(/tap to scroll to saved cards/i);
    expect(label).toMatch(/steward control ready/i);
  });

  it("does not append scroll hint on landing", () => {
    const label = statusAriaLabel("ok", "steward", "none", { pageKind: "landing" });
    expect(label).not.toMatch(/scroll to saved cards/i);
  });
});

describe("shouldCelebrateStewardTransition", () => {
  it("fires only on first steward transition with healthy network", () => {
    expect(
      shouldCelebrateStewardTransition({
        network: "ok",
        previousDevice: "keys",
        nextDevice: "steward",
      })
    ).toBe(true);
    expect(
      shouldCelebrateStewardTransition({
        network: "ok",
        previousDevice: "steward",
        nextDevice: "steward",
      })
    ).toBe(false);
    expect(
      shouldCelebrateStewardTransition({
        network: "degraded",
        previousDevice: "keys",
        nextDevice: "steward",
      })
    ).toBe(false);
    expect(
      shouldCelebrateStewardTransition({
        network: "ok",
        previousDevice: "keys",
        nextDevice: "steward",
        reducedMotion: true,
      })
    ).toBe(false);
  });
});

describe("dotTransitionKey", () => {
  it("includes network, device, and overlay", () => {
    expect(dotTransitionKey("ok", "steward", "proof_waiting")).toBe(
      "ok:steward:proof_waiting"
    );
  });
});

describe("shell S4 neutral dot and chrome status line", () => {
  it("uses neutral empty-wallet dot only when calm", () => {
    expect(
      shellDotUsesNeutralEmptyWallet({
        network: "ok",
        device: "none",
        overlay: "none",
        savedWalletCount: 0,
      })
    ).toBe(true);
    expect(
      shellDotUsesNeutralEmptyWallet({
        network: "ok",
        device: "none",
        overlay: "none",
        savedWalletCount: 1,
      })
    ).toBe(false);
    expect(
      shellDotUsesNeutralEmptyWallet({
        network: "ok",
        device: "unsaved",
        overlay: "none",
        savedWalletCount: 0,
      })
    ).toBe(false);
    expect(
      shellDotUsesNeutralEmptyWallet({
        network: "ok",
        device: "none",
        overlay: "cross_tab_keys",
        savedWalletCount: 0,
      })
    ).toBe(false);
    expect(
      shellDotUsesNeutralEmptyWallet({
        network: "degraded",
        device: "none",
        overlay: "none",
        savedWalletCount: 0,
      })
    ).toBe(false);
  });

  it("shows chrome status line when wallet empty and no urgent device state", () => {
    expect(
      shellStatusLinePrimaryInChrome({
        device: "none",
        overlay: "none",
        savedWalletCount: 0,
      })
    ).toBe(true);
    expect(
      shellStatusLinePrimaryInChrome({
        device: "keys",
        overlay: "none",
        savedWalletCount: 2,
      })
    ).toBe(false);
  });

  it("formats network and saved chips for chrome", () => {
    const line = shellChromeStatusLineFromSegments([
      {
        id: "network",
        chipLabel: "Network reachable",
        label: "Resolver Online",
        detail: "",
        zero: false,
        highlight: false,
      },
      {
        id: "saved",
        chipLabel: "0 cards",
        label: "No Cards on Device",
        detail: "",
        zero: true,
        highlight: false,
      },
      {
        id: "pinned",
        chipLabel: "0 pinned",
        label: "No Pinned Scans",
        detail: "",
        zero: true,
        highlight: false,
      },
    ]);
    expect(line).toBe("Network reachable · 0 cards");
  });

  it("omits zero saved subcopy on stranger landing", () => {
    const segments = [
      {
        id: "network",
        chipLabel: "Network reachable",
        label: "Resolver Online",
        detail: "",
        zero: false,
        highlight: false,
      },
      {
        id: "saved",
        chipLabel: "0 cards",
        label: "No Cards on Device",
        detail: "",
        zero: true,
        highlight: false,
      },
    ];
    expect(shellChromeStatusLineFromSegments(segments, { strangerLanding: true })).toBe(
      "Network reachable"
    );
    expect(shellChromeStatusLineFromSegments(segments)).toBe("Network reachable · 0 cards");
  });

  it("maps hub status segments to one calm inline status line", () => {
    const items = hubStatusLineItemsFromSegments([
      {
        id: "network",
        chipLabel: "Network reachable",
        label: "Resolver Online",
        detail: "Resolver Online",
        zero: false,
        highlight: false,
        chipTone: "network-ok",
      },
      {
        id: "saved",
        chipLabel: "0 cards",
        label: "No Cards on Device",
        detail: "",
        zero: true,
        highlight: false,
      },
      {
        id: "pinned",
        chipLabel: "0 pinned",
        label: "No Pinned Scans",
        detail: "",
        zero: true,
        highlight: false,
      },
      {
        id: "notices",
        chipLabel: "Not saved",
        label: "Control active in tab",
        detail: "",
        zero: false,
        highlight: true,
        chipTone: "highlight",
      },
    ]);

    expect(items.map((item) => item.label)).toEqual([
      "Network reachable",
      "0 cards",
      "0 pinned",
      "Not saved",
    ]);
    expect(items.find((item) => item.id === "network")?.emphasis).toBe("primary");
    expect(items.find((item) => item.id === "pinned")?.emphasis).toBe("meta");
    expect(items.find((item) => item.id === "pinned")?.zero).toBe(true);
    expect(items.find((item) => item.id === "notices")?.emphasis).toBe("alert");
  });

  it("maps neutral empty wallet tone for CSS", () => {
    expect(primaryDotTone("ok", "none", { shellNeutralEmpty: true })).toBe("neutral");
    expect(primaryDotTone("ok", "none", { shellNeutralEmpty: false })).toBe("unsaved");
    expect(SHELL_DOT_NEUTRAL_EMPTY_CLASS).toBe("shell-status-dot--neutral-empty");
  });
});

describe("dotClassList and primaryDotTone", () => {
  it("emits network, device, and overlay classes", () => {
    expect(dotClassList("ok", "steward", "proof_waiting")).toEqual([
      "pass-dot-status-network-ok",
      "pass-dot-status-device-steward",
      "pass-dot-overlay-proof_waiting",
    ]);
    expect(dotStateKey("ok", "steward")).toBe("ok:steward");
  });

  it("keeps steward green only when network is ok", () => {
    expect(primaryDotTone("ok", "steward")).toBe("steward");
    expect(primaryDotTone("degraded", "steward")).toBe("degraded");
    expect(primaryDotTone("offline", "steward")).toBe("offline");
  });
});

describe("dotPageKindFromPathname", () => {
  it("maps pathname to page kind", () => {
    expect(dotPageKindFromPathname("/")).toBe("landing");
    expect(dotPageKindFromPathname("/wallet/")).toBe("landing");
    expect(dotPageKindFromPathname("/wallet/", { isWalletPage: true })).toBe("wallet");
    expect(dotPageKindFromPathname("/create/")).toBe("create");
    expect(dotPageKindFromPathname("/created/abc")).toBe("created");
  });
});

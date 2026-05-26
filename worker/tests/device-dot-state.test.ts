import { describe, expect, it } from "vitest";

import {
  describeDotState,
  deviceStateFromContext,
  dotClassList,
  dotExplainerKicker,
  dotOverlayFromCounts,
  dotStateKey,
  hasStewardVerification,
  inboxOverlayQuickAction,
  overlayAriaText,
  primaryDotTone,
  shouldCelebrateStewardTransition,
  dotTransitionKey,
  statusAriaLabel,
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
      "Status: resolver online, steward keys ready, live proof waiting."
    );
    expect(statusAriaLabel("ok", "keys", "none")).toBe(
      "Status: resolver online, saved keys on device."
    );
  });
});

describe("overlayAriaText", () => {
  it("maps overlay ids to phrases", () => {
    expect(overlayAriaText("proof_waiting")).toBe("live proof waiting");
    expect(overlayAriaText("cross_tab_keys")).toBe("keys active in another tab");
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
    expect(degraded.why).toContain("Steward keys are ready locally");

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

  it("offers steward queue action when url is available", () => {
    const steward = describeDotState("ok", "steward", "none", {
      stewardReady: true,
      queueUrl: "/operator/vouch-audit.html",
    });
    expect(steward.id).toBe("steward");
    expect(steward.action).toEqual({
      kind: "open_steward_queue",
      label: "Open steward queue",
      href: "/operator/vouch-audit.html",
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
    expect(label).toMatch(/steward keys ready/i);
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

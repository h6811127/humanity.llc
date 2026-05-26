import { describe, expect, it } from "vitest";

import {
  describeDotState,
  deviceStateFromContext,
  dotClassList,
  dotExplainerKicker,
  dotOverlayFromCounts,
  dotStateKey,
  hasStewardVerification,
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
});

describe("dotExplainerKicker", () => {
  it("uses glance subtitle for compact steward state", () => {
    expect(dotExplainerKicker({ id: "steward" }, true)).toBe(
      "Steward ready: you can review and sign steward actions now."
    );
    expect(dotExplainerKicker({ id: "keys" }, true)).toBe("Status now");
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

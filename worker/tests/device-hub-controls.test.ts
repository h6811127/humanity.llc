import { describe, expect, it } from "vitest";
import {
  buildHubCardControls,
  partitionHubCardControls,
} from "../../site/js/device-hub-controls-core.mjs";

describe("buildHubCardControls", () => {
  it("returns prove live when a challenge is waiting", () => {
    const controls = buildHubCardControls({
      hasKeys: true,
      pendingLiveProof: true,
      scanKind: "active",
    });
    expect(controls[0]).toMatchObject({ id: "prove-live", focus: "live-proof" });
    expect(controls.some((c) => c.id === "update-status")).toBe(true);
  });

  it("returns no signed controls without keys", () => {
    expect(buildHubCardControls({ hasKeys: false, pendingLiveProof: false })).toEqual(
      []
    );
    expect(
      buildHubCardControls({ hasKeys: false, pendingLiveProof: true })[0]?.id
    ).toBe("prove-live");
  });

  it("offers update, revoke QR, and new QR for active cards with keys", () => {
    const controls = buildHubCardControls({
      hasKeys: true,
      pendingLiveProof: false,
      scanKind: "active",
    });
    expect(controls.map((c) => c.id)).toEqual([
      "update-status",
      "revoke-qr",
      "new-qr",
    ]);
    expect(controls.find((c) => c.id === "revoke-qr")?.menuHint).toBe(
      "Opens card page to confirm"
    );
  });

  it("narrows controls when the card is revoked on the network", () => {
    const controls = buildHubCardControls({
      hasKeys: true,
      pendingLiveProof: false,
      scanKind: "card_revoked",
    });
    expect(controls.map((c) => c.id)).toEqual(["revoke-state"]);
  });
});

describe("partitionHubCardControls", () => {
  it("keeps prove live inline and moves steward actions to the menu", () => {
    const controls = buildHubCardControls({
      hasKeys: true,
      pendingLiveProof: true,
      scanKind: "active",
    });
    const { inline, menu } = partitionHubCardControls(controls);
    expect(inline.map((c) => c.id)).toEqual(["prove-live"]);
    expect(menu.map((c) => c.id)).toEqual(["update-status", "revoke-qr", "new-qr"]);
  });

  it("puts all signed controls in the menu when no live proof is pending", () => {
    const controls = buildHubCardControls({
      hasKeys: true,
      pendingLiveProof: false,
      scanKind: "active",
    });
    const { inline, menu } = partitionHubCardControls(controls);
    expect(inline).toEqual([]);
    expect(menu.map((c) => c.id)).toEqual(["update-status", "revoke-qr", "new-qr"]);
  });
});

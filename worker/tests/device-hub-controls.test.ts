import { describe, expect, it } from "vitest";
import { buildHubCardControls } from "../../site/js/device-hub-controls-core.mjs";

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

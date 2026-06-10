import { describe, expect, it } from "vitest";

import {
  assessSeasonProgressiveChecklist,
  countGameNodesWithScanUrl,
  countRegisteredGameNodes,
  shouldShowSeasonProgressiveChecklist,
} from "../../site/js/created-season-progressive-checklist-core.mjs";
import { STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";

describe("assessSeasonProgressiveChecklist", () => {
  it("marks identity done when organizer issuer key present", () => {
    const result = assessSeasonProgressiveChecklist({
      profileId: "p1",
      walletEntry: { issuer_public_key: "org_pub" },
      childObjectRows: [],
    });
    expect(result.steps[0].id).toBe("identity");
    expect(result.steps[0].done).toBe(true);
    expect(result.activeStepId).toBe("first_scan_point");
  });

  it("counts registered game nodes excluding revoked", () => {
    expect(
      countRegisteredGameNodes([
        { object_type: "game_node", status: "active" },
        { object_type: "game_node", status: "revoked" },
        { object_type: "status_plate" },
      ])
    ).toBe(1);
  });

  it("counts only active game nodes with scan URLs as print-ready", () => {
    expect(
      countGameNodesWithScanUrl([
        { object_type: "game_node", status: "active", scan_url: " https://humanity.llc/c/p?q=qr1 " },
        { object_type: "game_node", status: "disabled", scan_url: "https://humanity.llc/c/p?q=qr2" },
        { object_type: "game_node", status: "revoked", scan_url: "https://humanity.llc/c/p?q=qr3" },
        { object_type: "game_node", status: "active", scan_url: "   " },
        { object_type: "status_plate", status: "active", scan_url: "https://humanity.llc/c/p?q=qr4" },
      ])
    ).toBe(1);
  });

  it("marks the checklist complete only after identity and printable scan point are ready", () => {
    const result = assessSeasonProgressiveChecklist({
      profileId: "p_ready",
      session: { issuer_public_key: "org_pub" },
      childObjectRows: [
        { object_type: "game_node", status: "active", scan_url: "https://humanity.llc/c/p_ready?q=qr1" },
      ],
    });

    expect(result.complete).toBe(true);
    expect(result.activeStepId).toBeNull();
    expect(result.gameNodeCount).toBe(1);
  });
});

describe("shouldShowSeasonProgressiveChecklist", () => {
  it("shows only in season room with profile", () => {
    expect(shouldShowSeasonProgressiveChecklist({ profileId: "", activeRoom: STEWARD_ROOM_SEASON })).toBe(
      false
    );
    expect(shouldShowSeasonProgressiveChecklist({ profileId: "p1", activeRoom: "doors" })).toBe(false);
    expect(
      shouldShowSeasonProgressiveChecklist({ profileId: "p1", activeRoom: STEWARD_ROOM_SEASON })
    ).toBe(true);
  });
});

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

  it("keeps print active until a live game node has a scan URL", () => {
    const inactiveRows = [
      { object_type: "game_node", status: "active" },
      {
        object_type: "game_node",
        status: "disabled",
        scan_url: "https://example.test/c/off",
      },
      {
        object_type: "game_node",
        status: "revoked",
        scan_url: "https://example.test/c/revoked",
      },
    ];

    expect(countRegisteredGameNodes(inactiveRows)).toBe(1);
    expect(countGameNodesWithScanUrl(inactiveRows)).toBe(0);

    const result = assessSeasonProgressiveChecklist({
      profileId: "p1",
      walletEntry: { issuer_public_key: "org_pub" },
      childObjectRows: inactiveRows,
    });

    expect(result.activeStepId).toBe("print");
    expect(result.complete).toBe(false);
    expect(result.steps.find((step) => step.id === "first_scan_point")?.done).toBe(true);
    expect(result.steps.find((step) => step.id === "print")?.done).toBe(false);
  });

  it("completes once the first registered game node has a scan URL", () => {
    const result = assessSeasonProgressiveChecklist({
      profileId: "p1",
      walletEntry: { organizer_public_key_b58: "org_pub" },
      childObjectRows: [
        {
          object_type: "game_node",
          status: "active",
          scan_url: "https://example.test/c/node-1",
        },
      ],
    });

    expect(result.complete).toBe(true);
    expect(result.activeStepId).toBeNull();
    expect(result.steps.every((step) => step.done)).toBe(true);
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

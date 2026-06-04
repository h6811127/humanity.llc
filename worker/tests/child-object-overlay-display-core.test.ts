import { describe, expect, it } from "vitest";

import {
  applyHubChildObjectOverlays,
  resolveTimePolicyPhaseFromPolicy,
  timePolicyHubChip,
} from "../../site/js/child-object-overlay-display-core.mjs";
import { custodyHubHint } from "../../site/js/child-object-custody-core.mjs";
import { resolveObjectTimePolicyPhase } from "../src/live-object/time-policy";

describe("child-object-overlay-display-core", () => {
  it("matches worker time_policy phase for dormant window", () => {
    const policy = {
      dormant_until: "2026-06-10T12:00:00.000Z",
      timezone: "UTC",
      schedule: [],
    };
    const now = new Date("2026-06-05T12:00:00.000Z");
    expect(resolveTimePolicyPhaseFromPolicy(policy, now)).toBe("dormant");
    expect(
      resolveObjectTimePolicyPhase(
        {
          valid_from: null,
          valid_until: null,
          dormant_until: policy.dormant_until,
          grace_period_hours: null,
          timezone: "UTC",
          schedule: [],
        },
        now
      )
    ).toBe("dormant");
    expect(timePolicyHubChip("dormant")).toBe("Object asleep");
  });

  it("applyHubChildObjectOverlays warns outside schedule", () => {
    const result = applyHubChildObjectOverlays(
      { label: "Open until 9 PM", tone: "ok" },
      {
        now: new Date("2026-06-05T18:00:00.000Z"),
        timePolicy: {
          timezone: "UTC",
          schedule: [{ local_hour_from: 9, local_hour_until: 17 }],
        },
      }
    );
    expect(result.tone).toBe("warn");
    expect(result.label).toContain("Outside hours");
    expect(result.label).toContain("Open until 9 PM");
  });

  it("applyHubChildObjectOverlays prefixes active custody", () => {
    const result = applyHubChildObjectOverlays(
      { label: "Open until 9 PM", tone: "ok" },
      {
        custody: {
          holder_label: "River gallery",
          until: "2026-12-31T22:00:00-05:00",
        },
      }
    );
    expect(result.label).toBe("Held by River gallery · Open until 9 PM");
    expect(result.tone).toBe("ok");
  });

  it("custodyHubHint hides expired assignments", () => {
    expect(
      custodyHubHint(
        { holder_label: "Desk", until: "2020-01-01T12:00:00.000Z" },
        new Date("2026-06-01T12:00:00.000Z")
      )
    ).toBeNull();
  });
});

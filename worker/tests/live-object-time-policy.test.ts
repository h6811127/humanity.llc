import { describe, expect, it } from "vitest";

import {
  parseObjectTimePolicy,
  resolveChildTimePolicyContext,
  resolveObjectTimePolicyPhase,
  validateTimePolicyForChildDocument,
} from "../src/live-object/time-policy";

describe("live-object time_policy (Layer 1)", () => {
  it("parses optional time_policy with schedule slots", () => {
    const policy = parseObjectTimePolicy({
      time_policy: {
        valid_from: "2026-06-01T12:00:00.000Z",
        valid_until: "2026-06-30T22:00:00-05:00",
        timezone: "America/Chicago",
        schedule: [
          {
            day_of_week: 4,
            local_hour_from: 9,
            local_hour_until: 21,
            public_state: "Open Thu 9 AM – 9 PM",
          },
        ],
      },
    });
    expect(policy?.valid_from).toBe("2026-06-01T12:00:00.000Z");
    expect(policy?.schedule).toHaveLength(1);
    expect(policy?.timezone).toBe("America/Chicago");
  });

  it("rejects time_policy on game_node documents", () => {
    expect(() =>
      validateTimePolicyForChildDocument(
        { time_policy: { valid_until: "2026-06-30T22:00:00-05:00" } },
        "game_node"
      )
    ).toThrow(/status_plate and lost_item_relay/);
  });

  it("allows status_plate documents without time_policy", () => {
    expect(() =>
      validateTimePolicyForChildDocument({}, "status_plate")
    ).not.toThrow();
  });

  it("resolves dormant_until before valid_from", () => {
    const policy = parseObjectTimePolicy({
      time_policy: {
        dormant_until: "2026-06-10T12:00:00.000Z",
        valid_from: "2026-06-01T12:00:00.000Z",
      },
    });
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-05T12:00:00.000Z"))
    ).toBe("dormant");
  });

  it("resolves before, after, and active phases", () => {
    const policy = parseObjectTimePolicy({
      time_policy: {
        valid_from: "2026-06-01T12:00:00.000Z",
        valid_until: "2026-06-30T22:00:00-05:00",
      },
    });
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-05-31T12:00:00.000Z"))
    ).toBe("before");
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-07-01T12:00:00.000Z"))
    ).toBe("after");
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-15T12:00:00.000Z"))
    ).toBe("active");
  });

  it("applies schedule public_state overlay when slot matches", () => {
    const applied = resolveChildTimePolicyContext({
      documentJson: JSON.stringify({
        time_policy: {
          timezone: "UTC",
          schedule: [
            {
              local_hour_from: 0,
              local_hour_until: 24,
              public_state: "Open all day (scheduled)",
            },
          ],
        },
      }),
      publicState: "Owner default state",
      now: new Date("2026-06-15T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("active");
    expect(applied.publicState).toBe("Open all day (scheduled)");
  });

  it("marks outside_schedule when no slot matches", () => {
    const applied = resolveChildTimePolicyContext({
      documentJson: JSON.stringify({
        time_policy: {
          timezone: "UTC",
          schedule: [
            {
              day_of_week: 0,
              local_hour_from: 0,
              local_hour_until: 1,
              public_state: "Sunday hour only",
            },
          ],
        },
      }),
      publicState: "Owner default state",
      now: new Date("2026-06-16T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("outside_schedule");
    expect(applied.context?.scanNote).toMatch(/outside its published hours/i);
    expect(applied.publicState).toBe("Owner default state");
  });

  it("enters grace phase after valid_until for recall window", () => {
    const policy = parseObjectTimePolicy({
      time_policy: {
        valid_until: "2026-06-10T12:00:00.000Z",
        grace_period_hours: 48,
      },
    });
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-09T12:00:00.000Z"))
    ).toBe("active");
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-11T12:00:00.000Z"))
    ).toBe("grace");
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-13T12:00:00.000Z"))
    ).toBe("after");
  });

  it("rejects grace_period_hours without valid_until", () => {
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { grace_period_hours: 48 },
      })
    ).toThrow(/requires valid_until/);
  });

  it("exposes graceEndsAt during recall grace on scan context", () => {
    const applied = resolveChildTimePolicyContext({
      documentJson: JSON.stringify({
        time_policy: {
          valid_until: "2026-06-10T12:00:00.000Z",
          grace_period_hours: 48,
        },
      }),
      publicState: "Flyer on pole",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("grace");
    expect(applied.context?.graceEndsAt).toBe("2026-06-12T12:00:00.000Z");
    expect(applied.context?.scanNote).toMatch(/recall grace period/i);
  });
});

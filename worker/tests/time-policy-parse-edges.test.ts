import { describe, expect, it } from "vitest";

import {
  parseObjectTimePolicy,
  resolveChildTimePolicyContext,
  resolveObjectTimePolicyPhase,
  timePolicyFromChildDocumentJson,
} from "../src/live-object/time-policy";

describe("parseObjectTimePolicy validation edges", () => {
  it("rejects a non-object time_policy and a non-array schedule", () => {
    expect(() => parseObjectTimePolicy({ time_policy: "open" })).toThrow(
      /time_policy must be an object/
    );
    expect(() =>
      parseObjectTimePolicy({ time_policy: { schedule: { day_of_week: 1 } } })
    ).toThrow(/schedule must be an array/);
  });

  it("caps schedule length at 14 slots", () => {
    const slots = Array.from({ length: 15 }, () => ({
      local_hour_from: 0,
      local_hour_until: 24,
    }));
    expect(() =>
      parseObjectTimePolicy({ time_policy: { schedule: slots } })
    ).toThrow(/at most 14 slots/);
    expect(
      parseObjectTimePolicy({
        time_policy: { schedule: slots.slice(0, 14) },
      })?.schedule
    ).toHaveLength(14);
  });

  it("requires both local hours together and bounds them 0–24", () => {
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { schedule: [{ local_hour_from: 9 }] },
      })
    ).toThrow(/both local_hour_from and local_hour_until/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { schedule: [{ local_hour_until: 17 }] },
      })
    ).toThrow(/both local_hour_from and local_hour_until/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: {
          schedule: [{ local_hour_from: -1, local_hour_until: 17 }],
        },
      })
    ).toThrow(/between 0 and 24/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: {
          schedule: [{ local_hour_from: 9, local_hour_until: 25 }],
        },
      })
    ).toThrow(/between 0 and 24/);
    expect(
      parseObjectTimePolicy({
        time_policy: {
          schedule: [{ local_hour_from: 9, local_hour_until: 24 }],
        },
      })?.schedule[0]
    ).toMatchObject({ local_hour_from: 9, local_hour_until: 24 });
  });

  it("rejects day_of_week outside 0–6 and empty public_state", () => {
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { schedule: [{ day_of_week: 7 }] },
      })
    ).toThrow(/between 0 \(Sun\) and 6 \(Sat\)/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { schedule: [{ day_of_week: -1 }] },
      })
    ).toThrow(/between 0 \(Sun\) and 6 \(Sat\)/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { schedule: [{ public_state: "   " }] },
      })
    ).toThrow(/public_state must be a string or null/);
  });

  it("bounds grace_period_hours to 1–720 and still requires valid_until", () => {
    expect(() =>
      parseObjectTimePolicy({
        time_policy: {
          valid_until: "2026-06-10T12:00:00.000Z",
          grace_period_hours: 0,
        },
      })
    ).toThrow(/between 1 and 720/);
    expect(() =>
      parseObjectTimePolicy({
        time_policy: {
          valid_until: "2026-06-10T12:00:00.000Z",
          grace_period_hours: 721,
        },
      })
    ).toThrow(/between 1 and 720/);
    expect(
      parseObjectTimePolicy({
        time_policy: {
          valid_until: "2026-06-10T12:00:00.000Z",
          grace_period_hours: 720,
        },
      })?.grace_period_hours
    ).toBe(720);
  });

  it("rejects invalid ISO instants and empty timezone", () => {
    expect(() =>
      parseObjectTimePolicy({
        time_policy: { valid_from: "2026-06-01 12:00" },
      })
    ).toThrow(/must be ISO 8601/);
    expect(() =>
      parseObjectTimePolicy({ time_policy: { timezone: "   " } })
    ).toThrow(/timezone must be a non-empty string/);
  });
});

describe("timePolicyFromChildDocumentJson", () => {
  it("swallows blank, invalid JSON, and invalid policy shapes", () => {
    expect(timePolicyFromChildDocumentJson(null)).toBeNull();
    expect(timePolicyFromChildDocumentJson("")).toBeNull();
    expect(timePolicyFromChildDocumentJson("{")).toBeNull();
    expect(
      timePolicyFromChildDocumentJson(
        JSON.stringify({ time_policy: { grace_period_hours: 48 } })
      )
    ).toBeNull();
  });

  it("returns a parsed policy from valid child document JSON", () => {
    const policy = timePolicyFromChildDocumentJson(
      JSON.stringify({
        time_policy: {
          valid_until: "2026-06-10T12:00:00.000Z",
          grace_period_hours: 24,
        },
      })
    );
    expect(policy?.valid_until).toBe("2026-06-10T12:00:00.000Z");
    expect(policy?.grace_period_hours).toBe(24);
    expect(policy?.timezone).toBe("UTC");
  });
});

describe("time_policy schedule overlay", () => {
  it("uses the last matching schedule slot when windows overlap", () => {
    const applied = resolveChildTimePolicyContext({
      documentJson: JSON.stringify({
        time_policy: {
          timezone: "UTC",
          schedule: [
            {
              local_hour_from: 0,
              local_hour_until: 24,
              public_state: "First slot all day",
            },
            {
              local_hour_from: 10,
              local_hour_until: 14,
              public_state: "Last matching slot wins",
            },
          ],
        },
      }),
      publicState: "Owner default",
      now: new Date("2026-06-15T12:00:00.000Z"),
    });
    expect(applied.context?.phase).toBe("active");
    expect(applied.publicState).toBe("Last matching slot wins");
  });

  it("keeps valid_until exclusive of grace until the instant is past", () => {
    const policy = parseObjectTimePolicy({
      time_policy: {
        valid_until: "2026-06-10T12:00:00.000Z",
        grace_period_hours: 48,
      },
    });
    expect(
      resolveObjectTimePolicyPhase(policy, new Date("2026-06-10T12:00:00.000Z"))
    ).toBe("active");
    expect(
      resolveObjectTimePolicyPhase(
        policy,
        new Date("2026-06-10T12:00:00.001Z")
      )
    ).toBe("grace");
  });
});

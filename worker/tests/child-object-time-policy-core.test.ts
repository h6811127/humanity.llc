import { describe, expect, it } from "vitest";

import {
  buildTimePolicyFromForm,
  childObjectUpdateExtraFields,
  datetimeLocalToIso,
  preserveChildDocumentFields,
  timePolicyFormDefaults,
} from "../../site/js/child-object-time-policy-core.mjs";

describe("child-object-time-policy-core", () => {
  it("converts datetime-local values to ISO", () => {
    const iso = datetimeLocalToIso("2026-06-14T18:00");
    expect(typeof iso).toBe("string");
    expect(iso).toMatch(/2026-06-14/);
  });

  it("builds time_policy from form data with schedule slot", () => {
    const policy = buildTimePolicyFromForm({
      time_policy_enabled: "1",
      time_policy_timezone: "America/Chicago",
      time_policy_schedule_day: "4",
      time_policy_schedule_hour_from: "9",
      time_policy_schedule_hour_until: "21",
      time_policy_schedule_public_state: "Open Thu 9 AM – 9 PM",
    });
    expect(policy?.timezone).toBe("America/Chicago");
    expect(policy?.schedule).toHaveLength(1);
    expect(policy?.schedule?.[0]).toMatchObject({
      day_of_week: 4,
      local_hour_from: 9,
      local_hour_until: 21,
      public_state: "Open Thu 9 AM – 9 PM",
    });
  });

  it("returns null when time policy checkbox is off", () => {
    expect(buildTimePolicyFromForm({ time_policy_enabled: "" })).toBeNull();
  });

  it("preserves time_policy and custody on status-line-only updates", () => {
    const row = {
      object_id: "obj_1",
      object_type: "status_plate",
      public_label: "Door",
      public_state: "Open",
      time_policy: { valid_until: "2026-12-31T22:00:00-05:00", timezone: "UTC", schedule: [] },
      custody: { holder_label: "Desk", until: null, note: null },
    };
    expect(preserveChildDocumentFields(row)).toEqual({
      time_policy: row.time_policy,
      custody: row.custody,
    });
  });

  it("replaces time_policy when publishing a new policy", () => {
    const row = {
      object_id: "obj_1",
      object_type: "status_plate",
      public_label: "Door",
      public_state: "Open",
      custody: { holder_label: "Desk", until: null, note: null },
    };
    const nextPolicy = {
      timezone: "UTC",
      valid_from: null,
      valid_until: "2026-12-31T22:00:00-05:00",
      dormant_until: null,
      schedule: [],
    };
    expect(childObjectUpdateExtraFields(row, nextPolicy)).toEqual({
      custody: row.custody,
      time_policy: nextPolicy,
    });
  });

  it("hydrates form defaults from stored row", () => {
    const defaults = timePolicyFormDefaults({
      time_policy: {
        valid_until: "2026-06-14T22:00:00-05:00",
        grace_period_hours: 48,
        timezone: "America/Chicago",
        schedule: [
          {
            day_of_week: 4,
            local_hour_from: 9,
            local_hour_until: 21,
            public_state: "Open Thu",
          },
        ],
      },
    });
    expect(defaults.enabled).toBe(true);
    expect(defaults.grace_period_hours).toBe("48");
    expect(defaults.schedule_day).toBe("4");
    expect(defaults.schedule_public_state).toBe("Open Thu");
  });

  it("builds recall grace hours when valid until is set", () => {
    const policy = buildTimePolicyFromForm({
      time_policy_enabled: "1",
      time_policy_valid_until: "2026-06-14T18:00",
      time_policy_grace_period_hours: "48",
    });
    expect(policy?.grace_period_hours).toBe(48);
    expect(policy?.valid_until).toMatch(/2026-06-14/);
  });

  it("rejects recall grace without valid until", () => {
    expect(() =>
      buildTimePolicyFromForm({
        time_policy_enabled: "1",
        time_policy_grace_period_hours: "48",
        time_policy_schedule_hour_from: "9",
        time_policy_schedule_hour_until: "17",
      })
    ).toThrow(/valid-until date/);
  });
});

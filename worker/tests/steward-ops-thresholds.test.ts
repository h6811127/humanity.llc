import { describe, expect, it } from "vitest";

import {
  evaluateStewardOpsThresholds,
  stewardOpsAlertsHaveCritical,
} from "../src/steward/ops-thresholds";

describe("evaluateStewardOpsThresholds", () => {
  it("warns when schema is missing", () => {
    const alerts = evaluateStewardOpsThresholds({ schema: "missing" });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].code).toBe("schema_missing");
  });

  it("critical when per-account auto poll exceeds hard cap", () => {
    const alerts = evaluateStewardOpsThresholds({
      schema: "ok",
      hosted_steward_enabled: true,
      usage: [
        {
          event: "poll.live_proof.auto",
          count: 210_000,
          accounts: 2,
          devices: 3,
        },
      ],
      controls: {
        fair_use: {
          hosted_account_soft_daily_auto_polls: 50_000,
          hosted_account_hard_daily_auto_polls: 100_000,
        },
      },
    });
    expect(alerts.some((alert) => alert.code === "fair_use_hard_poll")).toBe(true);
    expect(stewardOpsAlertsHaveCritical(alerts)).toBe(true);
  });

  it("warns on soft cap before hard cap", () => {
    const alerts = evaluateStewardOpsThresholds({
      schema: "ok",
      usage: [
        {
          event: "poll.live_proof.auto",
          count: 120_000,
          accounts: 2,
          devices: 2,
        },
      ],
      controls: {
        fair_use: {
          hosted_account_soft_daily_auto_polls: 50_000,
          hosted_account_hard_daily_auto_polls: 100_000,
        },
      },
    });
    expect(alerts.some((alert) => alert.code === "fair_use_soft_poll")).toBe(true);
    expect(stewardOpsAlertsHaveCritical(alerts)).toBe(false);
  });

  it("warns on lifecycle accounts and push delivery pressure", () => {
    const alerts = evaluateStewardOpsThresholds({
      schema: "ok",
      accounts: [{ plan_id: "hosted_steward_v1", status: "past_due", accounts: 1 }],
      usage: [
        {
          event: "notify.push.delivered",
          count: 20_000,
          accounts: 1,
          devices: 1,
        },
      ],
      controls: {
        fair_use: { hosted_push_delivered_daily: 10_000 },
      },
    });
    expect(alerts.map((alert) => alert.code)).toEqual(
      expect.arrayContaining(["lifecycle_review", "push_delivered_high"])
    );
  });

  it("returns no alerts on healthy snapshot", () => {
    const alerts = evaluateStewardOpsThresholds({
      schema: "ok",
      hosted_steward_enabled: true,
      accounts: [{ plan_id: "hosted_steward_v1", status: "active", accounts: 1 }],
      usage: [
        {
          event: "poll.live_proof.auto",
          count: 400,
          accounts: 1,
          devices: 1,
        },
      ],
      push: {
        accounts_with_connections: 1,
        active_connections: 1,
        max_connections_per_account: 5,
      },
      controls: {
        fair_use: {
          hosted_account_soft_daily_auto_polls: 50_000,
          hosted_account_hard_daily_auto_polls: 100_000,
          hosted_push_delivered_daily: 10_000,
        },
      },
    });
    expect(alerts).toEqual([]);
  });
});

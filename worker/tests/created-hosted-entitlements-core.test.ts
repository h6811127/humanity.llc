import { describe, expect, it } from "vitest";

import {
  REFERENCE_FREE_POLICY,
} from "../../site/js/device-steward-entitlements-core.mjs";
import {
  buildCreatedHostedPlanPanelModel,
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "../../site/js/created-hosted-entitlements-core.mjs";

describe("buildCreatedHostedPlanPanelModel", () => {
  it("offers upgrade CTA on reference_free even before session link", () => {
    const model = buildCreatedHostedPlanPanelModel(
      { ...REFERENCE_FREE_POLICY },
      null,
      { hasSession: false }
    );
    const steward = model.upgrades.find((u) => u.planId === HOSTED_STEWARD_PLAN_ID);
    expect(steward?.needsAccountLink).toBe(true);
    expect(steward?.label).toBe("Load keys on Live first");
    expect(steward?.needsSigningKeys).toBe(true);
  });

  it("offers Connect when keys loaded but no session", () => {
    const model = buildCreatedHostedPlanPanelModel(
      { ...REFERENCE_FREE_POLICY },
      null,
      { hasSession: false, hasSigningKeys: true }
    );
    const steward = model.upgrades.find((u) => u.planId === HOSTED_STEWARD_PLAN_ID);
    expect(steward?.label).toBe("Connect steward account");
  });

  it("shows reference_free upgrade when session linked", () => {
    const model = buildCreatedHostedPlanPanelModel(
      { ...REFERENCE_FREE_POLICY },
      {
        usage: {
          period_key: "2026-06-03",
          counters: { "poll.live_proof.auto": 12 },
          limits: { "poll.live_proof.auto": 400 },
        },
      },
      { hasSession: true }
    );
    expect(model.upgrades.some((u) => u.planId === HOSTED_STEWARD_PLAN_ID)).toBe(true);
    expect(model.metrics.some((m) => m.term === "Auto checks used today")).toBe(true);
  });

  it("marks steward poll at limit", () => {
    const model = buildCreatedHostedPlanPanelModel(
      {
        ...REFERENCE_FREE_POLICY,
        stewardHosted: true,
        pollLiveProofAutoDailyCap: 4000,
        planId: HOSTED_STEWARD_PLAN_ID,
      },
      {
        usage: {
          counters: { "poll.live_proof.auto": 4000 },
          limits: { "poll.live_proof.auto": 4000 },
        },
      },
      { hasSession: true }
    );
    expect(model.atLimitMessage).toContain("Daily automatic live-proof");
  });

  it("renders game_season meters and game upgrade on free node cap", () => {
    const model = buildCreatedHostedPlanPanelModel(
      { ...REFERENCE_FREE_POLICY },
      {
        game_season: {
          season_id: "cr_season_01_wake",
          enabled: true,
          limits: { "game.season.node_cap": 15 },
          usage: {
            counters: { "game.contribute": 100, "game.snapshot.get": 50 },
            limits: { "game.contribute": 25000, "game.snapshot.get": 100000 },
          },
        },
      },
      { hasSession: true }
    );
    expect(model.gameSeasonTitle).toContain("cr_season_01_wake");
    expect(model.gameSeasonMetrics.length).toBeGreaterThan(0);
    expect(model.upgrades.some((u) => u.planId === HOSTED_GAME_SEASON_PLAN_ID)).toBe(
      true
    );
  });

  it("surfaces multi-season hint without parsing block", () => {
    const model = buildCreatedHostedPlanPanelModel(
      { ...REFERENCE_FREE_POLICY },
      {
        game_season: {
          season_ids: ["a", "b"],
          hint: "Pass ?season_id=…",
        },
      },
      { hasSession: true }
    );
    expect(model.multiSeasonHint).toContain("Pass");
    expect(model.gameSeasonMetrics).toHaveLength(0);
  });
});

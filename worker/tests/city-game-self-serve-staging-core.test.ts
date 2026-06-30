import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadSeasonJsonFile } from "../../site/js/city-game-season-path-core.mjs";
import {
  assessSelfServeStagingReady,
  assessScanGraphPublishForStaging,
  assessUnlockGraphForStaging,
  countActiveGameNodes,
  formatSelfServeStagingReport,
  mergeSeasonWithMetadataDraft,
  publishDraftFromMetadata,
  resolveSelfServeStagingSeasonPath,
  resolveStagingNodeTarget,
  SELF_SERVE_STAGING_REQUIRED_NODE_COUNT,
  SELF_SERVE_SUMMER_SEASON_ID,
  selfServeStagingWalkthroughSteps,
  stagingScanGraphPublishReady,
  stagingUnlockGraphReady,
  unlockGraphReadyForSeason,
} from "../../site/js/city-game-self-serve-staging-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("city-game-self-serve-staging-core", () => {
  const exampleSeason = loadSeasonJsonFile(root, "city-game-example-season-01.json");
  const crSeason = loadSeasonJsonFile(root, "city-game-cr-season-01.json");

  it("lists browser-only E3 walkthrough steps with season node count", () => {
    const exampleSteps = selfServeStagingWalkthroughSteps(exampleSeason);
    expect(exampleSteps.length).toBeGreaterThanOrEqual(6);
    expect(exampleSteps.join("\n")).toMatch(/Register all 15 nodes/);
    expect(exampleSteps.join("\n")).toMatch(/\/created\//);
    expect(exampleSteps.join("\n")).toMatch(/unlock edges/i);
    expect(exampleSteps.join("\n")).toMatch(/install pack/i);
    expect(exampleSteps.join("\n")).not.toMatch(/city-game:mint-node -- --all/);

    const crSteps = selfServeStagingWalkthroughSteps(crSeason, true);
    expect(crSteps.join("\n")).toMatch(/Register all 40 nodes/);
    expect(crSteps.join("\n")).toMatch(/Publish scan graph edges/i);
    expect(crSteps.join("\n")).toMatch(/launch-surfaces/);
  });

  it("resolves staging node target from season template", () => {
    expect(resolveStagingNodeTarget(exampleSeason)).toBe(15);
    expect(resolveStagingNodeTarget(crSeason)).toBe(40);
  });

  it("counts active game nodes with issued QRs", () => {
    expect(
      countActiveGameNodes([
        { object_type: "game_node", status: "active", qr_id: "qr_a" },
        { object_type: "game_node", status: "active", qr_id: null },
        { object_type: "status_plate", status: "active", qr_id: "qr_b" },
      ])
    ).toBe(1);
  });

  it("blocks pilot season without browser staging mode", () => {
    const result = assessSelfServeStagingReady({ season: crSeason, browserStagingWalkthrough: false });
    expect(result.engineeringReady).toBe(false);
    expect(result.blockers[0]).toMatch(/browser-staging/i);
  });

  it("allows pilot season in browser staging mode", () => {
    const result = assessSelfServeStagingReady({
      season: crSeason,
      browserStagingWalkthrough: true,
      unlockGraphReady: true,
      rulesPublishReady: true,
    });
    expect(result.engineeringReady).toBe(true);
    expect(result.expectedNodes).toBe(40);
    expect(result.warnings[0]).toMatch(/pilot/i);
  });

  it("tracks network progress toward season template length", () => {
    const exampleTarget = resolveStagingNodeTarget(exampleSeason);
    const partial = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: exampleTarget - 1,
      profileId: "prof_example",
    });
    expect(partial.engineeringReady).toBe(false);
    expect(partial.blockers[0]).toContain(`${exampleTarget - 1}/${exampleTarget}`);

    const complete = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: exampleTarget,
      profileId: "prof_example",
      rulesPublishReady: true,
      unlockGraphReady: true,
    });
    expect(complete.humanWalkthroughComplete).toBe(true);
  });

  it("tracks Cedar Rapids summer progress toward 40 nodes", () => {
    const target = resolveStagingNodeTarget(crSeason);
    expect(target).toBe(40);

    const partial = assessSelfServeStagingReady({
      season: crSeason,
      browserStagingWalkthrough: true,
      networkGameNodeCount: 39,
      profileId: "prof_cr_staging",
    });
    expect(partial.blockers[0]).toContain("39/40");

    const complete = assessSelfServeStagingReady({
      season: crSeason,
      browserStagingWalkthrough: true,
      networkGameNodeCount: 40,
      profileId: "prof_cr_staging",
      rulesPublishReady: true,
      unlockGraphReady: true,
    });
    expect(complete.humanWalkthroughComplete).toBe(true);
  });

  it("formats a readable preflight report", () => {
    const text = formatSelfServeStagingReport(
      assessSelfServeStagingReady({ season: crSeason, browserStagingWalkthrough: true })
    );
    expect(text).toContain("E3");
    expect(text).toContain("Browser walkthrough");
    expect(text).toContain("Unlock graph ready");
    expect(text).toContain("/40");
  });

  it("defaults E3 preflight path to Cedar Rapids summer season", () => {
    const path = resolveSelfServeStagingSeasonPath(root, ["node", "script.mjs"]);
    expect(path).toContain("city-game-cr-season-01.json");
  });

  it("validates unlock graph for staging sign-off", () => {
    const graph = assessUnlockGraphForStaging(exampleSeason);
    expect(graph.ready).toBe(true);

    const crGraph = stagingUnlockGraphReady(crSeason, null, true);
    expect(crGraph).toBe(true);

    const empty = assessUnlockGraphForStaging(exampleSeason, { unlock_edges: [] });
    expect(empty.ready).toBe(false);
  });

  it("merges metadata draft for rules and unlock checks", () => {
    const merged = mergeSeasonWithMetadataDraft(exampleSeason, {
      window: {
        starts_at: "2026-07-04T18:00:00.000Z",
        ends_at: "2026-07-06T23:59:00.000Z",
      },
      status: "active",
    });
    const draft = publishDraftFromMetadata(merged);
    expect(unlockGraphReadyForSeason(merged, draft)).toBe(true);
  });

  it("requires unlock graph for human walkthrough complete", () => {
    const target = SELF_SERVE_STAGING_REQUIRED_NODE_COUNT;
    const complete = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: target,
      profileId: "prof_example",
      rulesPublishReady: true,
      unlockGraphReady: true,
    });
    expect(complete.humanWalkthroughComplete).toBe(true);

    const missingGraph = assessSelfServeStagingReady({
      season: exampleSeason,
      networkGameNodeCount: target,
      profileId: "prof_example",
      rulesPublishReady: true,
      unlockGraphReady: false,
    });
    expect(missingGraph.humanWalkthroughComplete).toBe(false);
  });

  it("blocks E3 when scan graph edges are missing on Live", () => {
    const target = resolveStagingNodeTarget(crSeason);
    const missing = assessSelfServeStagingReady({
      season: crSeason,
      browserStagingWalkthrough: true,
      networkGameNodeCount: target,
      profileId: "prof_cr_staging",
      rulesPublishReady: true,
      unlockGraphReady: true,
      scanGraphPublishReady: false,
    });
    expect(missing.engineeringReady).toBe(false);
    expect(missing.blockers[0]).toMatch(/Scan graph edges not published/i);
    expect(missing.humanWalkthroughComplete).toBe(false);
  });

  it("stagingScanGraphPublishReady compares draft edges to live API rows", () => {
    const missing = stagingScanGraphPublishReady(crSeason, null, [], "prof_cr", true);
    expect(missing).toBe(false);

    const live = [
      { edge_id: "edge_cr_witness_10_07", status: "active" },
      { edge_id: "edge_cr_unlock_04_07", status: "active" },
    ];
    const ready = stagingScanGraphPublishReady(crSeason, null, live, "prof_cr", true);
    expect(ready).toBe(true);

    const graph = assessScanGraphPublishForStaging(crSeason, null, [], "prof_cr");
    expect(graph.ready).toBe(false);
    expect(graph.missingEdgeIds?.length).toBe(2);
  });

  it("formats scan graph line in preflight report", () => {
    const text = formatSelfServeStagingReport(
      assessSelfServeStagingReady({
        season: crSeason,
        browserStagingWalkthrough: true,
        scanGraphPublishReady: false,
      })
    );
    expect(text).toContain("Scan graph on Live: no");
  });

  it("uses summer season id in CR walkthrough sign-off command", () => {
    const steps = selfServeStagingWalkthroughSteps(crSeason, true);
    expect(steps.join("\n")).toContain(SELF_SERVE_SUMMER_SEASON_ID);
  });
});

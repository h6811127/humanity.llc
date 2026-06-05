import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildJamieWayfindingChecks,
  buildPlayerGuideListHtml,
  comprehensionPrimaryNodeId,
  resolveComprehensionProbeNodes,
  resolvePlayerGuide,
  seasonComprehensionPath,
} from "../../site/js/city-game-player-guide-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const crSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const exampleSeason = JSON.parse(
  readFileSync(join(root, "site/data/city-game-example-season-01.json"), "utf8")
);

describe("city-game-player-guide-core", () => {
  it("resolves Cedar Rapids player guide from season JSON", () => {
    const guide = resolvePlayerGuide(crSeason);
    expect(guide.steps).toHaveLength(5);
    expect(guide.steps[2]?.title).toMatch(/Signal War/i);
    expect(guide.steps[4]?.title).toMatch(/Fog/i);
    expect(guide.quorumSpot?.title).toBe("Riverwalk River Lantern");
    expect(guide.heroSubline).toContain("/play/cedar-rapids/map/");
  });

  it("builds HTML list with quorum spot", () => {
    const html = buildPlayerGuideListHtml(crSeason);
    expect(html).toContain("No required first stop");
    expect(html).toContain("Riverwalk River Lantern");
  });

  it("derives comprehension paths and probe nodes per city", () => {
    expect(seasonComprehensionPath(crSeason)).toBe("/play/cedar-rapids/comprehension/");
    expect(seasonComprehensionPath(exampleSeason)).toBe("/play/example-city/comprehension/");
    expect(comprehensionPrimaryNodeId(crSeason)).toBe("node_04");
    expect(comprehensionPrimaryNodeId(exampleSeason)).toBe("node_02");

    const probes = resolveComprehensionProbeNodes(crSeason);
    expect(probes.map((row) => row.node_id)).toEqual(["node_04", "node_07", "node_02", "node_14"]);
    expect(probes[0]?.blurb).toContain("GT-1");
  });

  it("customizes Jamie W3 with quorum spot label", () => {
    const checks = buildJamieWayfindingChecks(crSeason);
    expect(checks.find((row) => row.id === "GT-W3")?.prompt).toContain("Riverwalk River Lantern");
  });
});

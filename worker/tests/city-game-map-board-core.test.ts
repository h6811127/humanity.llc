import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  abbreviatePinLabel,
  buildMapBoardInnerHtml,
  buildMapSchematicSvg,
  buildMapsSearchUrl,
  validateMapLayout,
} from "../../site/js/city-game-map-board-core.mjs";
import { isDenseMapBoard } from "../../site/js/city-game-map-interaction-core.mjs";
import { cityGameSeasonReadiness } from "../scripts/city-game-season-readiness.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("validateMapLayout", () => {
  it("passes for current season registry", () => {
    expect(validateMapLayout(season)).toEqual([]);
  });

  it("requires every node_id in map_layout.nodes", () => {
    const broken = {
      ...season,
      map_layout: {
        version: 1,
        nodes: { node_01: { x: 0.5, y: 0.5 } },
      },
    };
    const issues = validateMapLayout(broken);
    expect(issues.some((i) => i.includes("node_02"))).toBe(true);
  });

  it("rejects coordinates outside [0, 1]", () => {
    const broken = {
      ...season,
      map_layout: {
        version: 1,
        nodes: { ...season.map_layout.nodes, node_01: { x: 1.2, y: 0.5 } },
      },
    };
    expect(validateMapLayout(broken).some((i) => i.includes("node_01"))).toBe(true);
  });
});

describe("city-game map board render", () => {
  it("builds schematic svg with unlock edges and place-name pins", () => {
    const svg = buildMapSchematicSvg(season);
    expect(svg).toContain('class="city-game-map-edge"');
    expect(svg).toContain('class="city-game-map-pin"');
    expect(svg).toContain("River spine");
    expect(svg).toContain("River Lantern");
    expect(svg).not.toContain(">04<");
  });

  it("builds external maps search urls from label and city", () => {
    const row = season.nodes.find((n: { node_id: string }) => n.node_id === "node_04");
    const url = buildMapsSearchUrl(season, row);
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain(encodeURIComponent("Riverwalk River Lantern, Cedar Rapids, Iowa"));
  });

  it("abbreviates long pin labels without node numbers", () => {
    expect(abbreviatePinLabel("Riverwalk River Lantern")).toBe("River Lantern");
    expect(abbreviatePinLabel("NewBo relay arch")).toBe("relay arch");
  });

  it("board html avoids player-tracking vocabulary and surfaces wayfinding", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html.toLowerCase()).not.toMatch(/heatmap|your progress|your visits|players nearby/i);
    expect(html).toContain("No visit log");
    expect(html).toContain("Open in Maps");
    expect(html).toContain("city-game-map-node-live");
    expect(html).toContain("Scan on arrival");
    expect(html).toContain("Pick a district");
    expect(html).toContain("Open a place");
    expect(html).toContain("Scan when you arrive");
    expect(html).toContain("city-game-map-actions");
    expect(html).not.toContain("city-game-map-start-here");
    expect(html).not.toContain("city-game-map-wayfinding");
    expect(html).toContain("Quest log");
    expect(html).toContain("city-game-map-state");
    expect(html).toContain("Places");
    expect(html).toContain("city-game-map-places--primary");
    expect(html).toContain('id="city-game-map-progress"');
    expect(html).toContain("The city is asleep.");
    expect(html).toContain("fragments recovered");
    expect(html).not.toContain("Places by district");
    expect(html).not.toContain("Live map flavor");
    expect(html).not.toContain("Unlock paths");
    expect(html).toContain("City goals");
    if (isDenseMapBoard(season)) {
      expect(html).toContain("city-game-map-board--dense");
    } else {
      expect(html).not.toContain("city-game-map-board--dense");
    }
    expect(html).toContain("city-game-map-filter");
    expect(html).toContain("city-game-map-sketch-details");
    expect(html).toContain('id="district-sketch">');
    expect(html).not.toContain('id="district-sketch" open');
    expect(html).toContain("District sketch");
    expect(html).toContain("not a street map");
    expect(html).toContain("Data policy");
    expect(html).toContain("city-game-map-advanced");
    expect(html).toContain("Map &amp; mechanics");
    expect(html).toContain("Hidden on the sketch");
    expect(html).toContain("Wake the city: 0 /");
    expect(html).toContain("city-game-map-explore-filter");
    expect(html).toContain('data-explore-filter="relay_gate"');
    expect(html).toContain("Relay 17");
    expect(html).toContain('data-role="relay_gate"');
    expect(html).not.toContain("city-game-map-roles-details");
    expect(html).not.toContain("Place types");
    expect(html).not.toContain("Signal War · fog");
    expect(html).not.toContain("public lattice");
    expect(html).not.toContain("quorum and witness");
    expect(html).not.toContain("Relay · gate");
    expect(html).not.toContain("city-game-map-node-tags");
    expect(html).not.toContain("city-game-map-edge-detail");
    expect(html).toContain("city-game-live-map-ticker");
    expect(html).toContain("city-game-map-sync");
    expect(html).toContain('data-edge-from="node_04"');
    expect(html).toContain("Downtown alley arch");
    expect(html).not.toContain("node_04 ·");
  });
});

describe("cityGameSeasonReadiness map_layout", () => {
  it("includes map_layout in readiness checks", () => {
    const { ready, issues } = cityGameSeasonReadiness(season);
    expect(issues).toEqual([]);
    expect(ready).toBe(true);
  });
});

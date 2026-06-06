import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  abbreviatePinLabel,
  buildMapBoardInnerHtml,
  buildMapSchematicSvg,
  buildMapsSearchUrl,
  formatMysteryNodeCopy,
  formatNodeEffectLine,
  nodeRowStaticVisibility,
  resolveRowScanCta,
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

  it("hides dense-board pin labels when requested", () => {
    const svg = buildMapSchematicSvg(season, { hidePinLabels: true });
    expect(svg).toContain('class="city-game-map-pin-label"');
    expect(svg).toContain('visibility="hidden"');
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

  it("formats place-row effect lines from unlock edges", () => {
    const line = formatNodeEffectLine("node_04", "temp_drop", season);
    expect(line).toContain("Adds to shared city count");
    expect(line).toContain("unlocks Czech Village");
  });

  it("uses role-specific row CTAs", () => {
    expect(resolveRowScanCta("relay_gate")).toBe("Find this relay");
    expect(resolveRowScanCta("temp_drop")).toBe("Find this drop");
  });

  it("board html avoids player-tracking vocabulary and surfaces mission-first layout", () => {
    const html = buildMapBoardInnerHtml(season);
    expect(html.toLowerCase()).not.toMatch(/heatmap|your progress|your visits|players nearby/i);
    expect(html).toContain("No visit log");
    expect(html).toContain("No account. No GPS. No visit log.");
    expect(html).toContain("Relays unclaimed · Finale dormant");
    expect(html).toContain('id="city-game-map-mission"');
    expect(html).toContain("Open in Maps");
    expect(html).toContain("city-game-map-node-live");
    expect(html).toContain("Find this relay");
    expect(html).toContain("Find a live sticker");
    expect(html).toContain("See what changed");
    expect(html).toContain("Each place can reveal a different live state or action.");
    expect(html).toContain('id="city-game-map-spotlight"');
    expect(html).toContain("Help wake the city.");
    expect(html).toContain("Riverwalk River Lantern");
    expect(html).toContain("Find the River Lantern and add one signal.");
    expect(html).toContain("Unlocks Czech Village cabinet");
    expect(html).toContain("Find the River Lantern");
    expect(html).toContain("Live count opens when play starts.");
    expect(html).toContain("city-game-map-board--launch");
    expect(html).toContain('data-primary-node="node_04"');
    expect(html).toContain("city-game-map-node-row--spotlight");
    expect(html).toContain('id="city-game-map-places"');
    expect(html).not.toContain('id="city-game-map-browse"');
    expect(html).toContain("city-game-map-browse-filters");
    expect(html).toContain("city-game-map-actions");
    expect(html).not.toContain("city-game-map-privacy-inline");
    expect(html).toContain("city-game-map-start-callout");
    expect(html).toContain("Start at Riverwalk River Lantern.");
    expect(html).not.toContain("city-game-map-wayfinding");
    expect(html).not.toContain("Pick a district");
    expect(html).not.toContain("Scan when you arrive");
    expect(html).toContain('id="city-game-map-live-state"');
    expect(html).toContain("Live city state");
    expect(html).toContain("What changes when the city wakes");
    expect(html).toContain("city-game-map-wake-loop");
    expect(html).toContain('id="city-game-map-activity"');
    expect(html).toContain("City activity");
    expect(html).toContain("city-game-map-routes-preview");
    expect(html).toContain("Routes waking with the city");
    expect(html).toContain('id="city-game-map-filters"');
    expect(html).toContain("Filter places");
    expect(html).not.toContain('id="city-game-map-changed"');
    expect(html).toContain("Places");
    expect(html).toContain("city-game-map-list-scroll");
    expect(html).toContain("city-game-map-mobile-sketch");
    expect(html).toContain("city-game-map-places--primary");
    expect(html).toContain('id="city-game-map-progress"');
    expect(html).toContain('id="city-game-map-mission-consequence"');
    expect(html).toContain("Recover 3 shared fragments");
    expect(html).toContain("Move 1 · Quorum chain");
    expect(html).toContain("How scanning works");
    expect(html).toContain("0 / 3 fragments recovered");
    expect(html).not.toMatch(/enter code|back of the sticker|Add to the city|Add your charge/i);
    expect(html).not.toContain("Places by district");
    expect(html).not.toContain("Live map flavor");
    expect(html).not.toContain("Unlock paths");
    expect(html).toContain("City goals");
    expect(html).toContain("city-game-map-node-effect");
    expect(html).toContain(" · Relay");
    if (isDenseMapBoard(season)) {
      expect(html).toContain("city-game-map-board--dense");
      expect(html).toContain("city-game-map-sketch-details--dense");
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
    expect(html).toContain("Routes &amp; unlocks");
    expect(html).not.toContain("Map &amp; mechanics");
    expect(html).toContain("Hidden on the sketch");
    expect(html).toContain("Wake the city: 0 /");
    expect(html).toContain("city-game-map-type-filter");
    expect(html).toContain('data-type-filter="relay_gate"');
    expect(html).toContain("Relays");
    expect(html).toContain("city-game-map-state-filter");
    expect(html).toContain('data-state-filter="needs_action"');
    expect(html).toContain("city-game-map-filter-btn-count");
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
    expect(html).not.toContain("Live count loading");
    expect(html).not.toContain("River Lantern tracks one shared city count.");
  });
});

describe("city-game map board gameplay framing", () => {
  it("gives rumored hidden relays unique clue copy instead of repeated filler", () => {
    const mystery = formatMysteryNodeCopy("node_08", "relay_gate", season);
    expect(mystery.title).toMatch(/Rumored relay/i);
    expect(mystery.title).not.toBe("Hidden relay");
    expect(mystery.consequence).toContain("Czech Village square bench");
    expect(mystery.consequence).not.toBe("Reveals when the city claims a network hold");
  });

  it("omits unclaimed relay rows from the static list under signal_war fog", () => {
    expect(nodeRowStaticVisibility(season, { node_id: "node_01", role: "relay_gate" })).toBe(
      "omitted"
    );
    expect(nodeRowStaticVisibility(season, { node_id: "node_08", role: "relay_gate" })).toBe(
      "clue"
    );
    expect(nodeRowStaticVisibility(season, { node_id: "node_07", role: "lore_archive" })).toBe(
      "public"
    );
    const html = buildMapBoardInnerHtml(season);
    expect(html).toContain("Rumored relay · Czech Village");
    const hiddenRelayMatches = html.match(/Hidden relay/g) ?? [];
    expect(hiddenRelayMatches.length).toBe(0);
  });
});

describe("cityGameSeasonReadiness map_layout", () => {
  it("includes map_layout in readiness checks", () => {
    const { ready, issues } = cityGameSeasonReadiness(season);
    expect(issues).toEqual([]);
    expect(ready).toBe(true);
  });
});

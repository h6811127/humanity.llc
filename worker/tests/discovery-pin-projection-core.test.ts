import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertDiscoveryPinPrivacyShape,
  filterDiscoveryPinsByNetworkLens,
  fingerprintDiscoveryPinIndex,
  isNodeDiscoveryIndexable,
  projectDiscoveryPinIndexFromSeason,
  projectDiscoveryPinFromSeasonNode,
  resolveDiscoveryRegionFromSeason,
  selectPrimaryObjectId,
} from "../../site/js/discovery-pin-projection-core.mjs";
import {
  resolveBoardContextMembers,
  resolveBoardContextView,
} from "../../site/js/city-game-board-context-core.mjs";
import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("discovery-pin-projection-core", () => {
  it("projects Cedar Rapids region slug from public_listing", () => {
    expect(resolveDiscoveryRegionFromSeason(season)).toBe("cedar-rapids-iowa");
  });

  it("rebuilds pin index idempotently from season JSON", () => {
    const first = projectDiscoveryPinIndexFromSeason(season);
    const second = projectDiscoveryPinIndexFromSeason(season);
    expect(first.index_version).toBe(second.index_version);
    expect(first.pins.length).toBe(second.pins.length);
    expect(first.pins.map((p) => p.pin_id)).toEqual(second.pins.map((p) => p.pin_id));
  });

  it("bootstrap produces one pin per season node (40/40)", () => {
    const index = projectDiscoveryPinIndexFromSeason(season);
    expect(index.pins.length).toBe(season.nodes.length);
    expect(index.pins.length).toBe(40);
    for (const pin of index.pins) {
      expect(pin.object_ids).toHaveLength(1);
      expect(pin.network_ids).toContain("cr_season_01_wake");
      expect(pin.region).toBe("cedar-rapids-iowa");
      assertDiscoveryPinPrivacyShape(pin);
      expect(pin).not.toHaveProperty("geo");
    }
  });

  it("skips excluded object types and roles", () => {
    expect(
      isNodeDiscoveryIndexable({
        node_id: "x1",
        object_id: "obj_x1",
        object_type: "lost_item_relay",
        label: "Lost keys",
        role: "relay_gate",
      })
    ).toBe(false);
    expect(
      isNodeDiscoveryIndexable({
        node_id: "x2",
        object_id: "obj_x2",
        object_type: "game_node",
        label: "Hoodie",
        role: "mobile_lore",
      })
    ).toBe(false);
    expect(
      projectDiscoveryPinFromSeasonNode(
        {
          node_id: "x3",
          object_id: "obj_x3",
          object_type: "print_artifact",
          label: "Wearable",
          role: "relay_gate",
        },
        "cedar-rapids-iowa",
        "v1"
      )
    ).toBeNull();
  });

  it("delisted season omits network_ids on pins", () => {
    const delisted = {
      ...season,
      public_listing: { ...season.public_listing, listed: false },
    };
    const index = projectDiscoveryPinIndexFromSeason(delisted);
    expect(index.pins.length).toBe(40);
    for (const pin of index.pins) {
      expect(pin.network_ids ?? []).toHaveLength(0);
    }
    expect(
      filterDiscoveryPinsByNetworkLens(index.pins, "cr_season_01_wake")
    ).toHaveLength(0);
  });

  it("network lens filter returns only matching pins", () => {
    const index = projectDiscoveryPinIndexFromSeason(season);
    const filtered = filterDiscoveryPinsByNetworkLens(
      index.pins,
      "cr_season_01_wake"
    );
    expect(filtered.length).toBe(40);
  });

  it("selects primary object for single-object pins", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins[0];
    expect(selectPrimaryObjectId(pin, { networkId: "cr_season_01_wake" })).toBe(
      pin.object_ids[0]
    );
  });

  it("fingerprint changes when pin rows change", () => {
    const index = projectDiscoveryPinIndexFromSeason(season);
    const base = fingerprintDiscoveryPinIndex(index.pins, index.region);
    const mutated = fingerprintDiscoveryPinIndex(
      index.pins.map((pin, i) =>
        i === 0 ? { ...pin, display_label: "Changed label" } : pin
      ),
      index.region
    );
    expect(mutated).not.toBe(base);
  });
});

describe("board context pin lens", () => {
  it("loads members from pin index filtered by network lens", () => {
    const pinIndex = projectDiscoveryPinIndexFromSeason(season);
    const members = resolveBoardContextMembers(season, { pinIndex });
    expect(members.length).toBe(40);
    expect(members.every((row) => row.pin_id || row.entry_id)).toBe(true);
    const lantern = members.find((row) => row.entry_id === "node_04");
    expect(lantern?.label).toContain("River Lantern");
    expect(lantern?.object_id).toBe("obj_cr_node_04_river");
  });

  it("board HTML stays equivalent with pin-powered context view", () => {
    const pinIndex = projectDiscoveryPinIndexFromSeason(season);
    const withoutPins = buildMapBoardInnerHtml(season);
    const withPins = buildMapBoardInnerHtml(
      season,
      resolveBoardContextView(season, { pinIndex })
    );
    expect(withPins).toContain("How this network works");
    expect(withPins).toContain('data-pin-lens="1"');
    expect(withPins).toContain("Riverwalk River Lantern");
    expect(withPins.replace(/\s+/g, " ")).toEqual(withoutPins.replace(/\s+/g, " "));
  });
});

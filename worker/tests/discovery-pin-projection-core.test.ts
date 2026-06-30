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
      expect(pin.geo?.precision).toBe("block");
      expect(Number.isFinite(pin.geo?.latitude)).toBe(true);
      expect(Number.isFinite(pin.geo?.longitude)).toBe(true);
    }
  });

  it("prefers steward public_listing.geo over schematic projection", () => {
    const custom = {
      ...season,
      nodes: season.nodes.map((node) =>
        node.node_id === "node_04"
          ? {
              ...node,
              public_listing: {
                listed: true,
                geo: { latitude: 41.981, longitude: -91.671, precision: "entrance" },
              },
            }
          : node
      ),
    };
    const pin = projectDiscoveryPinIndexFromSeason(custom).pins.find((row) =>
      row.pin_id.includes("node_04")
    );
    expect(pin?.geo).toEqual({
      latitude: 41.981,
      longitude: -91.671,
      precision: "entrance",
    });
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

  it("delisted season drops season-inherited pins from index", () => {
    const delisted = {
      ...season,
      public_listing: { ...season.public_listing, listed: false },
    };
    const index = projectDiscoveryPinIndexFromSeason(delisted);
    expect(index.pins.length).toBe(0);
    expect(
      filterDiscoveryPinsByNetworkLens(index.pins, "cr_season_01_wake")
    ).toHaveLength(0);
  });

  it("delisted season keeps explicitly listed object pins without network_ids", () => {
    const delisted = {
      ...season,
      public_listing: { ...season.public_listing, listed: false },
      nodes: season.nodes.map((node, i) =>
        i === 0
          ? { ...node, public_listing: { listed: true, title: node.label } }
          : node
      ),
    };
    const index = projectDiscoveryPinIndexFromSeason(delisted);
    expect(index.pins.length).toBe(1);
    expect(index.pins[0].network_ids ?? []).toHaveLength(0);
  });

  it("object-level delist drops pin from index while season stays listed", () => {
    const nodeDelisted = {
      ...season,
      nodes: season.nodes.map((node) =>
        node.node_id === "node_04"
          ? {
              ...node,
              public_listing: { listed: false },
            }
          : node
      ),
    };
    const index = projectDiscoveryPinIndexFromSeason(nodeDelisted);
    expect(index.pins.length).toBe(39);
    expect(index.pins.some((pin) => pin.pin_id.includes("node_04"))).toBe(false);
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

  it("board HTML adds discovery crosslinks when pin-powered context view is used", () => {
    const pinIndex = projectDiscoveryPinIndexFromSeason(season);
    const withoutPins = buildMapBoardInnerHtml(season);
    const withPins = buildMapBoardInnerHtml(
      season,
      resolveBoardContextView(season, { pinIndex })
    );
    expect(withPins).toContain("Key route stops");
    expect(withPins).toContain('data-pin-lens="1"');
    expect(withPins).toContain("Riverwalk River Lantern");
    expect(withPins).toContain("Browse places near me");
    expect(withPins).toContain("/discover/cedar-rapids-iowa/pin/");
    expect(withoutPins).toContain("Browse places near me");
    expect(withoutPins).not.toContain("/discover/cedar-rapids-iowa/pin/");
  });
});

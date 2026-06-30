import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildSeasonNodeScanIndex,
  renderDiscoveryPinDetail,
  renderDiscoveryPinObjectChooser,
  resolveScanUrlForPin,
} from "../../site/js/discovery-region-browse-core.mjs";
import {
  buildDiscoveryPinObjectEntries,
  resolveDiscoveryPrimaryObjectId,
  resolveDiscoveryPinScanTargets,
} from "../../site/js/discovery-primary-object-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("discovery-primary-object-core", () => {
  const scanIndex = buildSeasonNodeScanIndex(season);

  it("keeps single-object pins primary", () => {
    const pin = {
      pin_id: "pin_one",
      region: "cedar-rapids-iowa",
      display_label: "Door",
      object_ids: ["obj_cr_node_04_river"],
      network_ids: ["cr_season_01_wake"],
      facets: { object_type: "game_node", entry_id: "node_04" },
      listing: { listed: true, title: "Riverwalk River Lantern" },
      index_version: "v1",
    };
    const targets = resolveDiscoveryPinScanTargets(pin, scanIndex, {
      activeNetworkId: "cr_season_01_wake",
    });
    expect(targets.primaryObjectId).toBe("obj_cr_node_04_river");
    expect(targets.requiresChooser).toBe(false);
    expect(targets.primaryScanUrl).toContain("humanity.llc/c/");
  });

  it("prefers game_node under active network lens for multi-object pins", () => {
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      pin_id: "pin_multi",
      region: "cedar-rapids-iowa",
      display_label: "Library doorway",
      object_ids: ["obj_plate", "obj_cr_node_10_library"],
      network_ids: ["cr_season_01_wake"],
      facets: { object_type: "status_plate" },
      listing: { listed: true, title: "Library doorway" },
      index_version: "v1",
    };
    const entries = buildDiscoveryPinObjectEntries(pin, scanIndex);
    expect(entries.length).toBe(2);
    expect(
      resolveDiscoveryPrimaryObjectId(entries, pin, {
        activeNetworkId: "cr_season_01_wake",
      })
    ).toBe("obj_cr_node_10_library");
  });

  it("prefers status_plate when care pause is active on snapshot row", () => {
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      pin_id: "pin_care",
      region: "cedar-rapids-iowa",
      display_label: "Cooling center doorway",
      object_ids: ["obj_plate", "obj_game"],
      network_ids: ["cr_season_01_wake"],
      facets: { object_type: "game_node" },
      listing: { listed: true, title: "Cooling center doorway" },
      index_version: "v1",
    };
    const entries = [
      {
        object_id: "obj_plate",
        object_type: "status_plate",
        label: "Door plate",
        scan_url: "https://humanity.llc/c/plate?q=1",
        network_ids: [],
      },
      {
        object_id: "obj_game",
        object_type: "game_node",
        label: "Game node",
        scan_url: "https://humanity.llc/c/game?q=2",
        network_ids: ["cr_season_01_wake"],
      },
    ];
    const snapshotIndex = {
      byObjectId: new Map([
        [
          "obj_plate",
          { chips: [{ kind: "maintenance", label: "Care · Maintenance pause" }] },
        ],
      ]),
    };
    expect(
      resolveDiscoveryPrimaryObjectId(entries, pin, { snapshotIndex })
    ).toBe("obj_plate");
  });

  it("requires explicit chooser when multi-object primary is ambiguous", () => {
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      pin_id: "pin_ambiguous",
      region: "cedar-rapids-iowa",
      display_label: "Twin relays",
      object_ids: ["obj_a", "obj_b"],
      network_ids: ["cr_season_01_wake"],
      facets: { object_type: "relay_gate" },
      listing: { listed: true, title: "Twin relays" },
      index_version: "v1",
    };
    const entries = [
      {
        object_id: "obj_a",
        object_type: "relay_gate",
        label: "Relay A",
        scan_url: null,
        network_ids: ["cr_season_01_wake"],
      },
      {
        object_id: "obj_b",
        object_type: "relay_gate",
        label: "Relay B",
        scan_url: null,
        network_ids: ["cr_season_01_wake"],
      },
    ];
    const targets = resolveDiscoveryPinScanTargets(pin, scanIndex, {});
    expect(targets.requiresChooser).toBe(true);
    expect(targets.primaryObjectId).toBeNull();

    const chooser = renderDiscoveryPinObjectChooser(entries, null);
    expect(chooser).toContain("Choose which object to scan");
    const html = renderDiscoveryPinDetail(pin, {
      region: "cedar-rapids-iowa",
      scanUrl: null,
      requiresObjectChoice: true,
      objectChooserHtml: chooser,
    });
    expect(html).toContain("Pick an object below");
  });

  it("standalone scan_url unchanged for single-object pin", () => {
    const pin = {
      pin_id: "pin_test",
      region: "cedar-rapids-iowa",
      display_label: "Door",
      object_ids: ["obj_door"],
      facets: { object_type: "status_plate" },
      listing: { listed: true, title: "Door" },
      scan_url: "https://humanity.llc/c/x?q=standalone",
      index_version: "v1",
    };
    expect(resolveScanUrlForPin(pin, buildSeasonNodeScanIndex({}))).toBe(
      "https://humanity.llc/c/x?q=standalone"
    );
  });
});

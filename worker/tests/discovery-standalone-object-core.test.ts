import { describe, expect, it } from "vitest";

import {
  isStandaloneObjectDiscoveryIndexable,
  mergeStandaloneDiscoveryPins,
  parseDiscoveryStandaloneObjectsManifest,
  projectDiscoveryPinFromStandaloneObject,
  stablePinIdFromStandaloneObject,
} from "../../site/js/discovery-standalone-object-core.mjs";
import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const standaloneManifest = JSON.parse(
  readFileSync(join(root, "site/data/discovery-standalone-cedar-rapids-iowa.json"), "utf8")
);

describe("discovery-standalone-object-core", () => {
  it("requires explicit listing and scan_url for standalone objects", () => {
    expect(
      isStandaloneObjectDiscoveryIndexable({
        object_id: "obj_x",
        object_type: "status_plate",
        label: "Door",
        public_listing: { listed: true, title: "Door" },
      })
    ).toBe(false);
    expect(
      isStandaloneObjectDiscoveryIndexable({
        object_id: "obj_x",
        object_type: "status_plate",
        label: "Door",
        scan_url: "https://humanity.llc/c/x?q=y",
        public_listing: { listed: true, title: "Door" },
      })
    ).toBe(true);
  });

  it("projects standalone pin without network_ids or entry_id", () => {
    const row = standaloneManifest.objects[0];
    const pin = projectDiscoveryPinFromStandaloneObject(
      row,
      "cedar-rapids-iowa",
      "discovery-pin-v3:test"
    );
    expect(pin?.pin_id).toBe(
      stablePinIdFromStandaloneObject("obj_cr_pilot_cooling_center_plate", "cedar-rapids-iowa")
    );
    expect(pin?.network_ids ?? []).toHaveLength(0);
    expect(pin?.facets?.entry_id).toBeUndefined();
    expect(pin?.scan_url).toContain("humanity.llc/c/");
    expect(pin?.geo?.precision).toBe("block");
  });

  it("season registry wins on object_id collision", () => {
    const seasonIndex = projectDiscoveryPinIndexFromSeason(season);
    const seasonPin = seasonIndex.pins[0];
    const colliding = projectDiscoveryPinFromStandaloneObject(
      {
        ...standaloneManifest.objects[0],
        object_id: seasonPin.object_ids[0],
      },
      "cedar-rapids-iowa",
      "v1"
    );
    expect(colliding).toBeTruthy();
    const merged = mergeStandaloneDiscoveryPins(seasonIndex.pins, [/** @type {NonNullable<typeof colliding>} */ (colliding)]);
    expect(merged.length).toBe(seasonIndex.pins.length);
  });

  it("parses standalone manifest region", () => {
    const manifest = parseDiscoveryStandaloneObjectsManifest(standaloneManifest);
    expect(manifest.region).toBe("cedar-rapids-iowa");
    expect(manifest.objects.length).toBe(1);
  });
});

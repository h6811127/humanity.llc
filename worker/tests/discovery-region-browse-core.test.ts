import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildDiscoveryPinRowModel,
  buildSeasonNodeScanIndex,
  filterDiscoveryPinsByQuery,
  renderDiscoveryPinDetail,
  renderDiscoveryPinRows,
  resolveScanUrlForPin,
} from "../../site/js/discovery-region-browse-core.mjs";
import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("discovery-region-browse-core", () => {
  it("renders pin rows with detail links and distance labels", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins[0];
    const html = renderDiscoveryPinRows([
      buildDiscoveryPinRowModel(pin, {
        region: "cedar-rapids-iowa",
        distanceMeters: 420,
        stateHeadline: "Unclaimed",
      }),
    ]);
    expect(html).toContain("420 m");
    expect(html).toContain("?pin=pin_cedar-rapids-iowa_node_01");
    expect(html).not.toContain("/discover/cedar-rapids-iowa/pin/");
    expect(html).toContain(pin.display_label);
    expect(html).toContain("discovery-pin-row__state");
    expect(html).toContain("Unclaimed");
  });

  it("resolves scan url from season node registry", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins.find(
      (row) => row.facets?.entry_id === "node_04"
    );
    expect(pin).toBeTruthy();
    const index = buildSeasonNodeScanIndex(season);
    const scanUrl = resolveScanUrlForPin(/** @type {NonNullable<typeof pin>} */ (pin), index);
    expect(scanUrl).toContain("humanity.llc/c/");
    expect(scanUrl).toContain("qr_aMr8qJGBF9xpC1gu");
  });

  it("resolves scan url from pin.scan_url for standalone objects", () => {
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
    const index = buildSeasonNodeScanIndex({});
    expect(
      resolveScanUrlForPin(
        /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */ (
          pin
        ),
        index
      )
    ).toBe("https://humanity.llc/c/x?q=standalone");
  });

  it("filters pins by search query", () => {
    const pins = projectDiscoveryPinIndexFromSeason(season).pins;
    const filtered = filterDiscoveryPinsByQuery(pins, "River Lantern");
    expect(filtered.length).toBe(1);
    expect(filtered[0].display_label).toContain("River Lantern");
  });

  it("renders pin detail with live scan cta", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins.find(
      (row) => row.facets?.entry_id === "node_04"
    );
    expect(pin).toBeTruthy();
    const index = buildSeasonNodeScanIndex(season);
    const html = renderDiscoveryPinDetail(/** @type {NonNullable<typeof pin>} */ (pin), {
      region: "cedar-rapids-iowa",
      scanUrl: resolveScanUrlForPin(/** @type {NonNullable<typeof pin>} */ (pin), index),
      browseHref: "/discover/cedar-rapids-iowa/",
      boardHref: "/play/cedar-rapids/map/",
    });
    expect(html).toContain("Open live scan");
    expect(html).toContain("Riverwalk River Lantern");
    expect(html).toContain("/discover/cedar-rapids-iowa/");
  });
});

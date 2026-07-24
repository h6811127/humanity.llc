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

  it("returns null scan url when season node registry has no live link", () => {
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      pin_id: "pin_degraded_scan",
      region: "cedar-rapids-iowa",
      display_label: "Empty scan node",
      object_ids: ["obj_missing_scan"],
      network_ids: ["cr_season_01_wake"],
      primary_object_id: "obj_missing_scan",
      facets: { object_type: "game_node", entry_id: "node_missing_scan", role: "temp_drop" },
      listing: { listed: true, title: "Empty scan node" },
      scan_url: null,
      index_version: "v1",
    };
    const index = buildSeasonNodeScanIndex({
      nodes: [
        {
          node_id: "node_missing_scan",
          object_id: "obj_missing_scan",
          object_type: "game_node",
          label: "Empty scan node",
          scan_url: "   ",
        },
      ],
    });
    expect(resolveScanUrlForPin(pin, index)).toBeNull();
  });

  it("falls back to season registry scan url when pin.scan_url is blank", () => {
    const seed = projectDiscoveryPinIndexFromSeason(season).pins.find(
      (row) => row.facets?.entry_id === "node_04"
    );
    expect(seed).toBeTruthy();
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      .../** @type {NonNullable<typeof seed>} */ (seed),
      scan_url: "   ",
    };
    const index = buildSeasonNodeScanIndex(season);
    const scanUrl = resolveScanUrlForPin(pin, index);
    expect(scanUrl).toContain("humanity.llc/c/");
    expect(scanUrl).toContain("qr_aMr8qJGBF9xpC1gu");
  });

  it("renders degraded scan-link copy when season pin has no live scan target", () => {
    /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */
    const pin = {
      pin_id: "pin_degraded_detail",
      region: "cedar-rapids-iowa",
      display_label: "Board-only place",
      object_ids: ["obj_board_only"],
      network_ids: ["cr_season_01_wake"],
      facets: { object_type: "game_node", entry_id: "node_board_only", district: "river_spine" },
      listing: {
        listed: true,
        title: "Board-only place",
        summary: "Listed for planning, but the printed scan link is not published yet.",
      },
      scan_url: null,
      index_version: "v1",
    };
    const index = buildSeasonNodeScanIndex({
      nodes: [
        {
          node_id: "node_board_only",
          object_id: "obj_board_only",
          object_type: "game_node",
          label: "Board-only place",
        },
      ],
    });
    const scanUrl = resolveScanUrlForPin(pin, index);
    expect(scanUrl).toBeNull();

    const html = renderDiscoveryPinDetail(pin, {
      region: "cedar-rapids-iowa",
      scanUrl,
      browseHref: "/discover/cedar-rapids-iowa/",
      boardHref: "/play/cedar-rapids/map/",
    });
    expect(html).toContain("discovery-pin-detail__scan-missing");
    expect(html).toContain(
      "Live scan link unavailable — open the city board or scan the sticker on site."
    );
    expect(html).not.toContain("Open live scan");
    expect(html).not.toContain("Pick an object below");
    expect(html).toContain("Open network board");
    expect(html).toContain("/play/cedar-rapids/map/");
    expect(html).toContain("Board-only place");
  });
});

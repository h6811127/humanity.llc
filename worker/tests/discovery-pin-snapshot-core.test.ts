import { describe, expect, it } from "vitest";

import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";
import {
  buildSnapshotNodeIndex,
  discoveryPinSnapshotHeadline,
  renderDiscoveryPinSnapshotSection,
  resolveDiscoveryPinRowStateHeadline,
  resolveSnapshotRowForDiscoveryPin,
} from "../../site/js/discovery-pin-snapshot-core.mjs";
import { renderDiscoveryPinDetail } from "../../site/js/discovery-region-browse-core.mjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("discovery-pin-snapshot-core", () => {
  it("resolves snapshot row by entry_id then object_id", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins.find(
      (row) => row.facets?.entry_id === "node_04"
    );
    expect(pin).toBeTruthy();
    const snapshot = {
      nodes: [
        {
          node_id: "node_04",
          object_id: "obj_cr_node_04_river",
          role: "temp_drop",
          chips: [{ kind: "state", label: "State", value: "Live drop" }],
        },
      ],
    };
    const index = buildSnapshotNodeIndex(snapshot);
    const row = resolveSnapshotRowForDiscoveryPin(/** @type {NonNullable<typeof pin>} */ (pin), index);
    expect(row?.node_id).toBe("node_04");
    expect(discoveryPinSnapshotHeadline(/** @type {NonNullable<typeof pin>} */ (pin), row)).toBe(
      "Live drop"
    );
  });

  it("renders snapshot section with chips on pin detail", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins[0];
    const snap = {
      chips: [{ kind: "collective", label: "Network", value: "Red holds" }],
    };
    const section = renderDiscoveryPinSnapshotSection(pin, snap);
    expect(section).toContain("discovery-pin-detail__state");
    expect(section).toContain("city-game-map-node-chips");
    expect(section).toContain("Red holds");
    const html = renderDiscoveryPinDetail(pin, {
      region: "cedar-rapids-iowa",
      scanUrl: "https://humanity.llc/c/x?q=y",
      snapshotSectionHtml: section,
    });
    expect(html).toContain("Red holds");
  });

  it("row headline uses snapshot chips for season pins", () => {
    const pin = projectDiscoveryPinIndexFromSeason(season).pins.find(
      (row) => row.facets?.entry_id === "node_04"
    );
    expect(pin).toBeTruthy();
    const index = buildSnapshotNodeIndex({
      nodes: [
        {
          node_id: "node_04",
          chips: [{ kind: "state", value: "Live drop" }],
        },
      ],
    });
    expect(
      resolveDiscoveryPinRowStateHeadline(/** @type {NonNullable<typeof pin>} */ (pin), index)
    ).toBe("Live drop");
  });

  it("omits row headline for standalone pins without snapshot", () => {
    const pin = {
      pin_id: "pin_standalone",
      region: "cedar-rapids-iowa",
      display_label: "Cooling center",
      object_ids: ["obj_cr_pilot_cooling_center_plate"],
      network_ids: [],
      facets: { object_type: "status_plate" },
      listing: { listed: true, title: "Cooling center" },
      scan_url: "https://humanity.llc/c/x?q=y",
      index_version: "v1",
    };
    const index = buildSnapshotNodeIndex(null);
    expect(
      resolveDiscoveryPinRowStateHeadline(
        /** @type {import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin} */ (
          pin
        ),
        index
      )
    ).toBeNull();
  });
});

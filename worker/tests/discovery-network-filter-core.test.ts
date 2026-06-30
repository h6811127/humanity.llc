import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildDiscoveryBrowseQueryPath,
  DISCOVERY_NETWORK_FILTER_ALL,
  filterDiscoveryPinsByNetwork,
  parseDiscoveryNetworkQuery,
  renderDiscoveryNetworkFilterChips,
  resolveDiscoveryNetworkBoardHref,
  resolveDiscoveryNetworkOptionsForRegion,
} from "../../site/js/discovery-network-filter-core.mjs";
import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const seasonsIndex = JSON.parse(
  readFileSync(join(root, "site/data/city-game-seasons-index.json"), "utf8")
);

describe("discovery-network-filter-core", () => {
  const pins = projectDiscoveryPinIndexFromSeason(season).pins;

  it("parses and builds network query on browse path", () => {
    expect(parseDiscoveryNetworkQuery("?network=cr_season_01_wake&pin=abc")).toBe(
      "cr_season_01_wake"
    );
    expect(
      buildDiscoveryBrowseQueryPath("cedar-rapids-iowa", {
        network: "cr_season_01_wake",
        pin: "pin_test",
      })
    ).toBe("/discover/cedar-rapids-iowa/?network=cr_season_01_wake&pin=pin_test");
  });

  it("filters pins by network_ids client-side", () => {
    const filtered = filterDiscoveryPinsByNetwork(pins, "cr_season_01_wake");
    expect(filtered.length).toBe(40);
    expect(
      filterDiscoveryPinsByNetwork(
        [{ network_ids: [] }],
        "cr_season_01_wake"
      )
    ).toEqual([]);
    expect(filterDiscoveryPinsByNetwork(pins, DISCOVERY_NETWORK_FILTER_ALL).length).toBe(40);
  });

  it("resolves network chip options and board href for region", () => {
    const options = resolveDiscoveryNetworkOptionsForRegion(
      "cedar-rapids-iowa",
      seasonsIndex,
      pins
    );
    expect(options.length).toBe(1);
    expect(options[0].network_id).toBe("cr_season_01_wake");
    expect(options[0].label).toBe("Wake the city");
    expect(options[0].board_href).toBe("/play/cedar-rapids/map/");

    const chips = renderDiscoveryNetworkFilterChips(options, "cr_season_01_wake");
    expect(chips).toContain("All places");
    expect(chips).toContain("Wake the city");
    expect(chips).toContain('aria-pressed="true"');

    expect(resolveDiscoveryNetworkBoardHref(options, "cr_season_01_wake")).toBe(
      "/play/cedar-rapids/map/"
    );
  });
});

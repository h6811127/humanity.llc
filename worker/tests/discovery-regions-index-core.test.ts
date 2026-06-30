import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildDiscoveryRegionsFromSeasonsIndex,
  renderDiscoveryRegionsHubCards,
} from "../../site/js/discovery-regions-index-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonsIndex = JSON.parse(
  readFileSync(join(root, "site/data/city-game-seasons-index.json"), "utf8")
);

describe("discovery-regions-index-core", () => {
  it("lists only listed seasons with resolvable region slugs", () => {
    const regions = buildDiscoveryRegionsFromSeasonsIndex(seasonsIndex);
    expect(regions.length).toBe(1);
    expect(regions[0]).toMatchObject({
      region_slug: "cedar-rapids-iowa",
      browse_href: "/discover/cedar-rapids-iowa/",
      season_id: "cr_season_01_wake",
      network_display_name: "Wake the city",
    });
  });

  it("renders hub cards with browse cta", () => {
    const regions = buildDiscoveryRegionsFromSeasonsIndex(seasonsIndex);
    const html = renderDiscoveryRegionsHubCards(regions);
    expect(html).toContain("Browse places near me");
    expect(html).toContain("/discover/cedar-rapids-iowa/");
    expect(html).toContain("Wake the city");
  });
});

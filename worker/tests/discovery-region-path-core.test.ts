import { describe, expect, it } from "vitest";

import {
  discoveryPinBrowseQueryPath,
  discoveryPinDetailPath,
  discoveryPinIndexUrl,
  discoveryRegionBrowsePath,
  discoverySeasonJsonUrlForRegion,
  parseDiscoveryBrowseQuery,
  parseDiscoveryPathname,
  resolveDiscoveryRegionSlug,
} from "../../site/js/discovery-region-path-core.mjs";

describe("discovery-region-path-core", () => {
  it("builds region browse, share path, and in-app query detail paths", () => {
    expect(discoveryRegionBrowsePath("cedar-rapids-iowa")).toBe(
      "/discover/cedar-rapids-iowa/"
    );
    expect(
      discoveryPinDetailPath("cedar-rapids-iowa", "pin_cedar-rapids-iowa_node_04")
    ).toBe("/discover/cedar-rapids-iowa/pin/pin_cedar-rapids-iowa_node_04/");
    expect(
      discoveryPinBrowseQueryPath("cedar-rapids-iowa", "pin_cedar-rapids-iowa_node_04")
    ).toBe("/discover/cedar-rapids-iowa/?pin=pin_cedar-rapids-iowa_node_04");
    expect(discoveryPinIndexUrl("Cedar Rapids, Iowa")).toBe(
      "/data/discovery-cedar-rapids-iowa.json"
    );
  });

  it("parses browse query pin id", () => {
    expect(parseDiscoveryBrowseQuery("?pin=pin_cedar-rapids-iowa_node_04")).toBe(
      "pin_cedar-rapids-iowa_node_04"
    );
    expect(parseDiscoveryBrowseQuery("")).toBeNull();
  });

  it("parses browse and pin pathnames", () => {
    expect(parseDiscoveryPathname("/discover/cedar-rapids-iowa/")).toEqual({
      mode: "browse",
      region: "cedar-rapids-iowa",
    });
    expect(
      parseDiscoveryPathname("/discover/cedar-rapids-iowa/pin/pin_cedar-rapids-iowa_node_04")
    ).toEqual({
      mode: "pin",
      region: "cedar-rapids-iowa",
      pinId: "pin_cedar-rapids-iowa_node_04",
    });
  });

  it("resolves season json url from seasons index", () => {
    const seasonsIndex = {
      seasons: [
        {
          json_url: "/data/city-game-cr-season-01.json",
          public_listing: { region: "Cedar Rapids, Iowa" },
        },
      ],
    };
    expect(discoverySeasonJsonUrlForRegion("cedar-rapids-iowa", seasonsIndex)).toBe(
      "/data/city-game-cr-season-01.json"
    );
    expect(resolveDiscoveryRegionSlug({ region: "Cedar Rapids, Iowa" })).toBe(
      "cedar-rapids-iowa"
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  discoveryListingDisplayTitle,
  isObjectListedForDiscovery,
  normalizeDiscoveryGeoPrecision,
  parseDiscoveryPublicListing,
  parseDiscoveryPublicListingGeo,
} from "../../site/js/discovery-public-listing-core.mjs";

describe("discovery-public-listing-core", () => {
  it("parses season-style public_listing fields", () => {
    const listing = parseDiscoveryPublicListing({
      listed: true,
      title: "Wake the city",
      summary: "Public network board",
      region: "Cedar Rapids, Iowa",
      category: "city_games",
    });
    expect(listing.listed).toBe(true);
    expect(listing.explicitlySet).toBe(true);
    expect(listing.title).toBe("Wake the city");
    expect(listing.summary).toBe("Public network board");
    expect(listing.region).toBe("Cedar Rapids, Iowa");
    expect(listing.category).toBe("city_games");
    expect(listing.geo).toBeNull();
  });

  it("defaults missing listing to not listed", () => {
    const listing = parseDiscoveryPublicListing(null);
    expect(listing.listed).toBe(false);
    expect(listing.explicitlySet).toBe(false);
  });

  it("parses steward-published geo with precision tier", () => {
    const geo = parseDiscoveryPublicListingGeo({
      latitude: 41.9779,
      longitude: -91.6656,
      precision: "block",
    });
    expect(geo).toEqual({
      latitude: 41.9779,
      longitude: -91.6656,
      precision: "block",
    });
    expect(normalizeDiscoveryGeoPrecision("entrance")).toBe("entrance");
    expect(normalizeDiscoveryGeoPrecision("room")).toBeNull();
  });

  it("rejects invalid geo coordinates", () => {
    expect(parseDiscoveryPublicListingGeo({ latitude: 120, longitude: 0 })).toBeNull();
    expect(parseDiscoveryPublicListingGeo({ latitude: "x", longitude: 0 })).toBeNull();
  });

  it("requires explicit listed === true for standalone objects", () => {
    expect(isObjectListedForDiscovery({ object_id: "obj_x" })).toBe(false);
    expect(
      isObjectListedForDiscovery({
        object_id: "obj_x",
        public_listing: { listed: true, title: "Door plate" },
      })
    ).toBe(true);
  });

  it("honors explicit object delist even on listed season registry", () => {
    expect(
      isObjectListedForDiscovery(
        {
          node_id: "node_04",
          public_listing: { listed: false },
        },
        { seasonListed: true, onSeasonRegistry: true }
      )
    ).toBe(false);
  });

  it("inherits listing for season registry nodes when season is listed", () => {
    expect(
      isObjectListedForDiscovery(
        { node_id: "node_04", label: "River Lantern" },
        { seasonListed: true, onSeasonRegistry: true }
      )
    ).toBe(true);
    expect(
      isObjectListedForDiscovery(
        { node_id: "node_04", label: "River Lantern" },
        { seasonListed: false, onSeasonRegistry: true }
      )
    ).toBe(false);
  });

  it("prefers listing title over node label", () => {
    const listing = parseDiscoveryPublicListing({
      listed: true,
      title: "Public café window",
    });
    expect(discoveryListingDisplayTitle(listing, "NewBo café window")).toBe(
      "Public café window"
    );
  });
});

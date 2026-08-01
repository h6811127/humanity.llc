import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LANDING_PLACES_ALL_REGIONS_HREF,
  LANDING_PLACES_REGION_STORAGE_KEY,
  LANDING_PLACES_REGIONS_URL,
  buildLandingPlacesHubEntriesFromRegistry,
  buildLandingPlacesRegionOptions,
  cityLabelForLandingPlacesRegion,
  commitLandingPlacesRegionCtx,
  mergeLandingPlacesHubRegions,
  readLandingPlacesRegionPreference,
  readLandingPlacesRegionQueryParam,
  resolveLandingPlacesRegion,
  seasonIdForLandingPlacesRegion,
  writeLandingPlacesRegionPreference,
} from "../../site/js/landing-places-region-core.mjs";
import { LANDING_DEFAULT_DISCOVERY_REGION } from "../../site/js/landing-places-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const landingRegions = JSON.parse(
  readFileSync(join(root, "site/data/discovery-landing-regions.json"), "utf8")
);

describe("landing-places-region-core", () => {
  const hubs = buildLandingPlacesHubEntriesFromRegistry(landingRegions);
  const options = buildLandingPlacesRegionOptions(hubs);

  it("ships a multi-region landing catalog beyond Cedar Rapids", () => {
    expect(LANDING_PLACES_REGIONS_URL).toBe("/data/discovery-landing-regions.json");
    expect(LANDING_PLACES_ALL_REGIONS_HREF).toBe("/discover/");
    expect(options.map((row) => row.region_slug)).toEqual([
      "cedar-rapids-iowa",
      "example-city",
    ]);
    expect(LANDING_DEFAULT_DISCOVERY_REGION).toBe("cedar-rapids-iowa");
  });

  it("builds sorted region options from hub entries", () => {
    const mixed = buildLandingPlacesRegionOptions([
      {
        region_slug: "cedar-rapids-iowa",
        browse_href: "/discover/cedar-rapids-iowa/",
        label: "Wake the city",
        city: "Cedar Rapids, Iowa",
        summary: "",
        season_id: "cr_season_01_wake",
        network_display_name: "Wake the city",
        rules_path: "/play/cedar-rapids/",
      },
      {
        region_slug: "example-city-template",
        browse_href: "/discover/example-city-template/",
        label: "Example City",
        city: "Example City",
        summary: "",
        season_id: "example_city_season_01",
        network_display_name: "Example City",
        rules_path: null,
      },
    ]);
    expect(mixed.map((row) => row.region_slug)).toEqual([
      "cedar-rapids-iowa",
      "example-city-template",
    ]);
  });

  it("resolves query over preference over fallback", () => {
    expect(
      resolveLandingPlacesRegion({
        availableSlugs: options.map((row) => row.region_slug),
        queryRegion: "example-city",
        preferredRegion: "cedar-rapids-iowa",
        fallback: "cedar-rapids-iowa",
      })
    ).toBe("example-city");

    expect(
      resolveLandingPlacesRegion({
        availableSlugs: options.map((row) => row.region_slug),
        queryRegion: null,
        preferredRegion: "example-city",
        fallback: "cedar-rapids-iowa",
      })
    ).toBe("example-city");

    expect(
      resolveLandingPlacesRegion({
        availableSlugs: ["cedar-rapids-iowa"],
        queryRegion: "unknown-city",
        preferredRegion: "also-unknown",
        fallback: "cedar-rapids-iowa",
      })
    ).toBe("cedar-rapids-iowa");
  });

  it("reads region query and preference storage", () => {
    expect(readLandingPlacesRegionQueryParam("?region=Cedar%20Rapids%2C%20Iowa")).toBe(
      "cedar-rapids-iowa"
    );
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
    };
    writeLandingPlacesRegionPreference("example-city", storage);
    expect(store.get(LANDING_PLACES_REGION_STORAGE_KEY)).toBe("example-city");
    expect(readLandingPlacesRegionPreference(storage)).toBe("example-city");
  });

  it("resolves city label and season id for a region", () => {
    expect(cityLabelForLandingPlacesRegion(options, "cedar-rapids-iowa")).toBe("Cedar Rapids");
    expect(seasonIdForLandingPlacesRegion(options, "example-city", "cr_season_01_wake")).toBe(
      ""
    );
  });

  it("merges landing registry template regions without Boards listing", () => {
    const listed = [
      {
        region_slug: "cedar-rapids-iowa",
        browse_href: "/discover/cedar-rapids-iowa/",
        label: "Wake the city",
        city: "Cedar Rapids, Iowa",
        summary: "",
        season_id: "cr_season_01_wake",
        network_display_name: "Wake the city",
        rules_path: "/play/cedar-rapids/",
      },
    ];
    const merged = mergeLandingPlacesHubRegions(listed, landingRegions);
    expect(merged.map((row) => row.region_slug)).toEqual([
      "cedar-rapids-iowa",
      "example-city",
    ]);
    expect(merged[1].season_id).toBe("");
  });

  it("does not commit stale async region loads over a newer selection", () => {
    const placesApi = {
      placesCtx: { region: "cedar-rapids-iowa" },
    };
    const stale = { region: "example-city" };
    const fresh = { region: "cedar-rapids-iowa" };

    expect(commitLandingPlacesRegionCtx(placesApi, fresh, 2, 2)).toBe(true);
    expect(placesApi.placesCtx).toEqual(fresh);

    expect(commitLandingPlacesRegionCtx(placesApi, stale, 1, 2)).toBe(false);
    expect(placesApi.placesCtx).toEqual(fresh);
  });
});

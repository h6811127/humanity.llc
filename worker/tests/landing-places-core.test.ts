import { describe, expect, it } from "vitest";

import {
  LANDING_PLACES_FAR_AWAY_METERS,
  LANDING_PLACES_PREVIEW_LIMIT,
  filterLandingPinsByFacet,
  formatLandingPlacesFarAwayNotice,
  formatLandingPlacesLead,
  landingPlacesBrowseHref,
  landingPlacesEmptyMessage,
  resolveLandingCategoryPinFacet,
  resolveLandingPlacesNearestMeters,
  resolveLandingShelfPinFacet,
  selectLandingPlacesPreview,
} from "../../site/js/landing-places-core.mjs";

/** @param {Partial<import("../../site/js/discovery-pin-projection-core.mjs").DiscoveryPin>} overrides */
function pin(overrides) {
  return {
    pin_id: "pin_test",
    region: "cedar-rapids-iowa",
    display_label: "Test place",
    object_ids: ["obj_1"],
    facets: { object_type: "game_node" },
    listing: { listed: true, category: "game_node" },
    index_version: "test",
    ...overrides,
  };
}

describe("landing-places-core", () => {
  it("maps shelves and category chips to pin facets", () => {
    expect(resolveLandingShelfPinFacet("landing-shelf-live-now")).toBe("live_now");
    expect(resolveLandingShelfPinFacet("landing-shelf-open-paused")).toBe("open_paused");
    expect(resolveLandingShelfPinFacet("landing-shelf-return-hours")).toBe("return_hours");
    expect(resolveLandingCategoryPinFacet("city_games")).toBe("live_now");
    expect(resolveLandingCategoryPinFacet("resources")).toBe("open_paused");
    expect(resolveLandingCategoryPinFacet("markets")).toBe("all");
  });

  it("filters pins by shelf facet", () => {
    const pins = [
      pin({ pin_id: "g", display_label: "Game", facets: { object_type: "game_node" } }),
      pin({
        pin_id: "p",
        display_label: "Plate",
        facets: { object_type: "status_plate" },
        listing: { listed: true, category: "status_plate" },
      }),
      pin({
        pin_id: "l",
        display_label: "Lost",
        facets: { object_type: "lost_item_relay" },
        listing: { listed: true, category: "lost_item_relay" },
      }),
    ];
    expect(filterLandingPinsByFacet(pins, "live_now").map((p) => p.pin_id)).toEqual(["g"]);
    expect(filterLandingPinsByFacet(pins, "open_paused").map((p) => p.pin_id)).toEqual(["p"]);
    expect(filterLandingPinsByFacet(pins, "return_hours").map((p) => p.pin_id)).toEqual([
      "p",
      "l",
    ]);
  });

  it("previews a limited sorted pin list", () => {
    const pins = Array.from({ length: LANDING_PLACES_PREVIEW_LIMIT + 3 }, (_, i) =>
      pin({
        pin_id: `pin_${String(i).padStart(2, "0")}`,
        display_label: `Place ${String.fromCharCode(90 - i)}`,
      })
    );
    const preview = selectLandingPlacesPreview(pins, { facet: "all" });
    expect(preview.totalMatching).toBe(pins.length);
    expect(preview.pins).toHaveLength(LANDING_PLACES_PREVIEW_LIMIT);
    expect(preview.truncated).toBe(true);
    expect(preview.pins[0].display_label <= preview.pins[1].display_label).toBe(true);
  });

  it("builds browse href and lead copy", () => {
    expect(landingPlacesBrowseHref()).toBe("/discover/cedar-rapids-iowa/");
    expect(formatLandingPlacesLead({ pinCount: 41, cityLabel: "Cedar Rapids" })).toContain(
      "41 listed places"
    );
    expect(formatLandingPlacesLead({ pinCount: 41, nearMeActive: true })).toContain(
      "Sorted nearest first"
    );
    expect(landingPlacesEmptyMessage({ hasPins: true, facet: "open_paused" })).toMatch(
      /open\/paused/i
    );
    expect(
      landingPlacesEmptyMessage({ hasPins: false, cityLabel: "Example City" })
    ).toMatch(/No listed places in Example City/);
  });

  it("formats far-away density notice when nearest pin is distant (P5c)", () => {
    expect(
      formatLandingPlacesFarAwayNotice({
        cityLabel: "Cedar Rapids",
        nearestMeters: LANDING_PLACES_FAR_AWAY_METERS - 1,
      })
    ).toBeNull();
    expect(
      formatLandingPlacesFarAwayNotice({
        cityLabel: "Cedar Rapids",
        nearestMeters: LANDING_PLACES_FAR_AWAY_METERS + 500,
      })
    ).toMatch(/far from Cedar Rapids/);
    const distances = new Map([
      ["a", 120_000],
      ["b", 90_000],
    ]);
    expect(resolveLandingPlacesNearestMeters(distances)).toBe(90_000);
  });

  it("sorts preview nearest-first when client coords are present (P5b)", () => {
    const pins = [
      pin({
        pin_id: "far",
        display_label: "Far",
        geo: { latitude: 42.1, longitude: -91.5, precision: "block" },
      }),
      pin({
        pin_id: "near",
        display_label: "Near",
        geo: { latitude: 42.0, longitude: -91.65, precision: "block" },
      }),
    ];
    const preview = selectLandingPlacesPreview(pins, {
      clientCoords: { latitude: 42.0, longitude: -91.65 },
    });
    expect(preview.nearMeActive).toBe(true);
    expect(preview.pins.map((p) => p.pin_id)).toEqual(["near", "far"]);
    expect(preview.distancesByPinId.get("near")).toBeLessThan(
      preview.distancesByPinId.get("far") ?? Number.POSITIVE_INFINITY
    );
  });
});

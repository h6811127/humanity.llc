import { describe, expect, it } from "vitest";

import { buildSnapshotNodeIndex } from "../../site/js/discovery-pin-snapshot-core.mjs";
import {
  LANDING_DEFAULT_DISCOVERY_REGION,
  LANDING_PLACES_FAR_AWAY_METERS,
  LANDING_PLACES_PREVIEW_LIMIT,
  LANDING_PLACES_SEE_ALL_CTA,
  buildLandingPlacesRows,
  filterLandingPinsByFacet,
  formatLandingPlacesFarAwayNotice,
  formatLandingPlacesLead,
  landingPlacesBrowseHref,
  landingPlacesDefaultRegion,
  landingPlacesEmptyMessage,
  normalizeLandingPlacesRegions,
  renderLandingPlacesResults,
  resolveLandingCategoryPinFacet,
  resolveLandingPlacesNearestMeters,
  resolveLandingShelfPinFacet,
  selectLandingPlacesPreview,
} from "../../site/js/landing-places-core.mjs";
import {
  LANDING_PLACES_ALL_REGIONS_CTA,
  LANDING_PLACES_ALL_REGIONS_HREF,
} from "../../site/js/landing-places-region-core.mjs";

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

  it("normalizes landing region catalog rows and resolves the default (P5c)", () => {
    const raw = {
      default_region: "example-city",
      regions: [
        {
          region_slug: "Cedar Rapids Iowa",
          label: "Wake the city",
          city: "Cedar Rapids, Iowa",
          season_id: "cr_season_01_wake",
        },
        {
          region_slug: "example-city",
          label: "Example City",
          city: "Example City",
          season_id: "example_city_season_01",
          summary: "Template region",
        },
        { region_slug: "example-city", label: "Duplicate slug ignored" },
        { label: "missing slug ignored" },
        null,
        "bad-row",
      ],
    };
    const regions = normalizeLandingPlacesRegions(raw);
    expect(regions.map((row) => row.region_slug)).toEqual([
      "cedar-rapids-iowa",
      "example-city",
    ]);
    expect(regions[1]).toMatchObject({
      label: "Example City",
      city: "Example City",
      season_id: "example_city_season_01",
      summary: "Template region",
    });
    expect(landingPlacesDefaultRegion(regions, raw)).toBe("example-city");
    expect(landingPlacesDefaultRegion(regions, { default_region: "missing" })).toBe(
      LANDING_DEFAULT_DISCOVERY_REGION
    );
    expect(normalizeLandingPlacesRegions(null)).toEqual([]);
    expect(normalizeLandingPlacesRegions([])).toEqual([]);
  });

  it("builds landing place rows with near-me distance and snapshot headlines", () => {
    const pins = [
      pin({
        pin_id: "pin_far",
        display_label: "Far lantern",
        facets: { object_type: "game_node", entry_id: "node_far", role: "signal" },
        network_ids: ["net_cr"],
        geo: { latitude: 42.1, longitude: -91.5, precision: "block" },
      }),
      pin({
        pin_id: "pin_near",
        display_label: "Near lantern",
        facets: { object_type: "game_node", entry_id: "node_near", role: "signal" },
        network_ids: ["net_cr"],
        geo: { latitude: 42.0, longitude: -91.65, precision: "block" },
      }),
      pin({
        pin_id: "pin_plate",
        display_label: "Cooling center",
        facets: { object_type: "status_plate" },
        listing: { listed: true, category: "status_plate" },
        network_ids: [],
        object_ids: ["obj_plate"],
      }),
    ];
    const snapshotIndex = buildSnapshotNodeIndex({
      nodes: [
        {
          node_id: "node_near",
          chips: [{ kind: "state", value: "Live drop" }],
        },
        {
          node_id: "node_far",
          chips: [{ kind: "state", value: "Quiet" }],
        },
      ],
    });

    const model = buildLandingPlacesRows(pins, {
      region: "cedar-rapids-iowa",
      facet: "live_now",
      clientCoords: { latitude: 42.0, longitude: -91.65 },
      snapshotIndex,
    });

    expect(model.nearMeActive).toBe(true);
    expect(model.totalMatching).toBe(2);
    expect(model.rows.map((row) => row.pin_id)).toEqual(["pin_near", "pin_far"]);
    expect(model.rows[0]).toMatchObject({
      title: "Near lantern",
      stateHeadline: "Live drop",
      detailHref: "/discover/cedar-rapids-iowa/?pin=pin_near",
    });
    expect(model.rows[0].distanceLabel).toMatch(/m|km/);
    expect(model.rows[1].stateHeadline).toBe("Quiet");

    const withoutSnapshot = buildLandingPlacesRows(
      [
        pin({
          pin_id: "pin_plate",
          display_label: "Cooling center",
          facets: { object_type: "status_plate" },
          listing: { listed: true, category: "status_plate" },
          network_ids: [],
        }),
      ],
      { region: "example-city", snapshotIndex: null }
    );
    expect(withoutSnapshot.rows).toHaveLength(1);
    expect(withoutSnapshot.rows[0].stateHeadline).toBeNull();
    expect(withoutSnapshot.nearMeActive).toBe(false);
  });

  it("renders landing place results with truncated see-all and empty fallbacks", () => {
    const pins = Array.from({ length: LANDING_PLACES_PREVIEW_LIMIT + 2 }, (_, i) =>
      pin({
        pin_id: `pin_${String(i).padStart(2, "0")}`,
        display_label: `Place ${String.fromCharCode(65 + i)}`,
      })
    );
    const model = buildLandingPlacesRows(pins, { region: "cedar-rapids-iowa" });
    const html = renderLandingPlacesResults(model, {
      browseHref: "/discover/cedar-rapids-iowa/",
      sourcePinCount: pins.length,
    });
    expect(html).toContain('data-pin-id="pin_00"');
    expect(html).toContain(`>${LANDING_PLACES_SEE_ALL_CTA} (${model.totalMatching})<`);
    expect(html).toContain('id="landing-places-see-all"');
    expect(html).toContain('href="/discover/cedar-rapids-iowa/"');
    expect(html).not.toContain(LANDING_PLACES_ALL_REGIONS_HREF);

    const emptyFacet = buildLandingPlacesRows(pins, {
      region: "cedar-rapids-iowa",
      facet: "return_hours",
    });
    const emptyHtml = renderLandingPlacesResults(emptyFacet, {
      browseHref: "/discover/cedar-rapids-iowa/",
      sourcePinCount: pins.length,
      facet: "return_hours",
      cityLabel: "Cedar Rapids",
    });
    expect(emptyHtml).toContain("landing-places-empty");
    expect(emptyHtml).toMatch(/No return, relay, or hours places match this shelf/);
    expect(emptyHtml).toContain(
      `href="${LANDING_PLACES_ALL_REGIONS_HREF}">${LANDING_PLACES_ALL_REGIONS_CTA}<`
    );
    expect(emptyHtml).toContain(`>${LANDING_PLACES_SEE_ALL_CTA}<`);

    const noPins = buildLandingPlacesRows([], { region: "example-city" });
    const noPinsHtml = renderLandingPlacesResults(noPins, {
      browseHref: "/discover/example-city/",
      sourcePinCount: 0,
      cityLabel: "Example City",
    });
    expect(noPinsHtml).toMatch(/No listed places in Example City yet/);
    expect(noPinsHtml).toContain('href="/discover/example-city/"');
  });

  it("escapes untrusted labels when rendering landing place rows", () => {
    const model = buildLandingPlacesRows(
      [
        pin({
          pin_id: 'pin_"xss"',
          display_label: '<img src=x onerror=alert(1)>',
          facets: {
            object_type: "game_node",
            entry_id: "node_xss",
            role: "signal",
            district: '<b>District</b>',
          },
          network_ids: ["net_cr"],
        }),
      ],
      {
        region: "cedar-rapids-iowa",
        snapshotIndex: buildSnapshotNodeIndex({
          nodes: [
            {
              node_id: "node_xss",
              chips: [{ kind: "state", value: '<script>alert(1)</script>' }],
            },
          ],
        }),
      }
    );
    const html = renderLandingPlacesResults(model, {
      browseHref: '/discover/cedar-rapids-iowa/?q="1"',
      sourcePinCount: 1,
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain('href="/discover/cedar-rapids-iowa/?q=&quot;1&quot;"');
  });
});

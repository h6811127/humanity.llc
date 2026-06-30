import { describe, expect, it } from "vitest";

import {
  CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS,
  resolveDiscoveryGeoForSeasonNode,
  schematicLayoutToDiscoveryGeo,
} from "../../site/js/discovery-geo-projection-core.mjs";

describe("discovery-geo-projection-core", () => {
  it("maps schematic layout into block-precision geo inside city bounds", () => {
    const geo = schematicLayoutToDiscoveryGeo(0.5, 0.5);
    expect(geo.precision).toBe("block");
    expect(geo.latitude).toBeGreaterThan(CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS.south);
    expect(geo.latitude).toBeLessThan(CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS.north);
    expect(geo.longitude).toBeGreaterThan(CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS.west);
    expect(geo.longitude).toBeLessThan(CEDAR_RAPIDS_DISCOVERY_GEO_BOUNDS.east);
  });

  it("prefers object public_listing.geo over schematic fallback", () => {
    const geo = resolveDiscoveryGeoForSeasonNode(
      {
        node_id: "node_01",
        public_listing: {
          listed: true,
          geo: { latitude: 41.978, longitude: -91.67, precision: "entrance" },
        },
      },
      {
        map_layout: { nodes: { node_01: { x: 0.1, y: 0.1 } } },
      }
    );
    expect(geo).toEqual({
      latitude: 41.978,
      longitude: -91.67,
      precision: "entrance",
    });
  });

  it("projects season map_layout when no steward geo is published", () => {
    const geo = resolveDiscoveryGeoForSeasonNode(
      { node_id: "node_04" },
      { map_layout: { nodes: { node_04: { x: 0.435, y: 0.53 } } } }
    );
    expect(geo?.precision).toBe("block");
    expect(geo?.latitude).toBeCloseTo(41.978, 2);
  });
});

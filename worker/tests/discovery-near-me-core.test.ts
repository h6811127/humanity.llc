import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  countDiscoveryPinsWithGeo,
  formatDiscoveryNearMeDistance,
  haversineDistanceMeters,
  sortDiscoveryPinsByNearMe,
} from "../../site/js/discovery-near-me-core.mjs";
import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("discovery-near-me-core", () => {
  it("computes haversine distance in meters", () => {
    const meters = haversineDistanceMeters(
      { latitude: 41.978, longitude: -91.665 },
      { latitude: 41.979, longitude: -91.665 }
    );
    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(200);
  });

  it("formats near-me distance labels", () => {
    expect(formatDiscoveryNearMeDistance(450)).toBe("450 m");
    expect(formatDiscoveryNearMeDistance(1850)).toBe("1.9 km");
  });

  it("sorts geo pins nearest-first and keeps geo-less pins at the end", () => {
    const index = projectDiscoveryPinIndexFromSeason(season);
    const withoutGeo = index.pins.map((pin, i) =>
      i === 0 ? { ...pin, geo: undefined } : pin
    );
    const downtown = { latitude: 41.9785, longitude: -91.6682 };
    const sorted = sortDiscoveryPinsByNearMe(withoutGeo, downtown);
    expect(sorted.pins.at(-1)?.pin_id).toBe(withoutGeo[0].pin_id);
    expect(sorted.distancesByPinId.size).toBe(39);
    expect(countDiscoveryPinsWithGeo(index.pins)).toBe(40);
  });
});

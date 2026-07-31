import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  countDiscoveryPinsWithGeo,
  discoveryPinHasGeo,
  formatDiscoveryNearMeDistance,
  haversineDistanceMeters,
  requestDiscoveryClientCoords,
  sortDiscoveryPinsByNearMe,
} from "../../site/js/discovery-near-me-core.mjs";
import { projectDiscoveryPinIndexFromSeason } from "../../site/js/discovery-pin-projection-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("discovery-near-me-core", () => {
  it("exports browser geolocation helper for client-only sort", () => {
    expect(typeof requestDiscoveryClientCoords).toBe("function");
  });

  it("rejects when geolocation API is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(requestDiscoveryClientCoords()).rejects.toThrow(
      "Geolocation unavailable"
    );
  });

  it("resolves client coords from getCurrentPosition success", async () => {
    const getCurrentPosition = vi.fn((success) => {
      success({
        coords: {
          latitude: 41.978,
          longitude: -91.665,
          accuracy: 25,
        },
      });
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(requestDiscoveryClientCoords()).resolves.toEqual({
      latitude: 41.978,
      longitude: -91.665,
      accuracy: 25,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  });

  it("rejects with the PositionError from getCurrentPosition failure", async () => {
    const positionError = { code: 1, message: "User denied Geolocation" };
    const getCurrentPosition = vi.fn((_success, error) => {
      error(positionError);
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    await expect(requestDiscoveryClientCoords()).rejects.toBe(positionError);
  });

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
    expect(formatDiscoveryNearMeDistance(Number.NaN)).toBe("");
    expect(formatDiscoveryNearMeDistance(-10)).toBe("");
  });

  it("treats non-finite geo as missing", () => {
    expect(
      discoveryPinHasGeo({
        pin_id: "pin_bad",
        region: "cedar-rapids-iowa",
        display_label: "Bad",
        object_ids: [],
        facets: { object_type: "game_node" },
        listing: { listed: true, category: "game_node" },
        index_version: "test",
        geo: { latitude: Number.NaN, longitude: -91.665, precision: "block" },
      })
    ).toBe(false);
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

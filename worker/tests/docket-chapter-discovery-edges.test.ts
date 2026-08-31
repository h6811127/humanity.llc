import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  projectDocketChapterDiscoveryPins,
  validateDocketChapterDiscoveryPins,
} from "../../site/js/docket-chapter-discovery-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadPins() {
  return JSON.parse(
    readFileSync(join(root, "site/data/docket-chapter-discovery-pins.json"), "utf8")
  );
}

describe("docket-chapter-discovery-core reject edges", () => {
  it("rejects a city-discovery pollution flag on the registry", () => {
    const raw = loadPins();
    expect(validateDocketChapterDiscoveryPins(raw).ok).toBe(true);
    raw.pollutes_city_discovery = true;
    const result = validateDocketChapterDiscoveryPins(raw);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("pollutes_city_discovery"))).toBe(true);
  });

  it("rejects empty docs, duplicate ids, and starter-four case_ref", () => {
    expect(validateDocketChapterDiscoveryPins(null).ok).toBe(false);
    expect(validateDocketChapterDiscoveryPins([]).ok).toBe(false);

    const empty = loadPins();
    empty.pins = [];
    expect(validateDocketChapterDiscoveryPins(empty).ok).toBe(false);

    const dup = loadPins();
    dup.pins.push({ ...structuredClone(dup.pins[0]) });
    const dupResult = validateDocketChapterDiscoveryPins(dup);
    expect(dupResult.ok).toBe(false);
    expect(dupResult.errors.some((e) => e.includes("duplicate pin id"))).toBe(true);

    const starterRef = loadPins();
    starterRef.pins[0].case_ref = "altman";
    const refResult = validateDocketChapterDiscoveryPins(starterRef);
    expect(refResult.ok).toBe(false);
    expect(refResult.errors.some((e) => e.includes("starter-four"))).toBe(true);
  });

  it("requires minted pins to keep a Base58 child QR path", () => {
    const raw = loadPins();
    raw.pins[0].mint_status = "minted";
    raw.pins[0].live_object.scan_path = "/c/docketChapterCr01?q=qr_docket_chapter_cr_v1";
    const result = validateDocketChapterDiscoveryPins(raw);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("mint_status minted"))).toBe(true);
  });

  it("rejects unknown mint_status, thin steward sets, and incomplete geo", () => {
    const mint = loadPins();
    mint.pins[0].mint_status = "pending";
    expect(validateDocketChapterDiscoveryPins(mint).ok).toBe(false);

    const stewards = loadPins();
    stewards.pins[0].stewards = [stewards.pins[0].stewards[0]];
    expect(validateDocketChapterDiscoveryPins(stewards).ok).toBe(false);

    const geo = loadPins();
    geo.pins[0].geo = { latitude: 41.9, precision: "district" };
    const geoResult = validateDocketChapterDiscoveryPins(geo);
    expect(geoResult.ok).toBe(false);
    expect(geoResult.errors.some((e) => e.includes("latitude/longitude"))).toBe(true);

    const precision = loadPins();
    precision.pins[0].geo.precision = "neighborhood";
    expect(validateDocketChapterDiscoveryPins(precision).ok).toBe(false);
  });

  it("projection always emits the city-discovery fence even if a row is messy", () => {
    const raw = loadPins();
    raw.pollutes_city_discovery = true;
    raw.pins[0].pollutes_city_discovery = true;
    const projected = projectDocketChapterDiscoveryPins(raw);
    expect(projected).toHaveLength(1);
    expect(projected[0].pollutes_city_discovery).toBe(false);
    expect(projected[0].branch).toBe("public-docket");
    expect(projected[0].pin_id).toBe("pin_docket_chapter_chapter-cr-research-circle");
    expect(String(projected[0].primary_object_id)).not.toContain("_altman");
  });
});

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DOCKET_CHAPTER_PINS_KIND,
  DOCKET_CHAPTER_PINS_KIT_REL,
  DOCKET_CHAPTER_PINS_PAGE_PATH,
  projectDocketChapterDiscoveryPins,
  validateDocketChapterDiscoveryPins,
} from "../../site/js/docket-chapter-discovery-core.mjs";
import { DOCKET_STARTER_CASE_IDS } from "../../site/js/docket-discovery-opt-in-core.mjs";
import { assessWsDocketChapterPinsPreflight } from "../scripts/ws-docket-chapter-pins-preflight-core.mjs";
import {
  buildWsDocketChapterPinsKitHtml,
  validateWsDocketChapterPinsKitHtml,
} from "../scripts/ws-docket-chapter-pins-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-chapter-discovery-core (WS-DOCKET C-v3 publish)", () => {
  it("validates published chapter pins registry", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-chapter-discovery-pins.json"), "utf8")
    );
    const result = validateDocketChapterDiscoveryPins(raw);
    expect(result.ok).toBe(true);
    expect(raw.kind).toBe(DOCKET_CHAPTER_PINS_KIND);
    expect(raw.pollutes_city_discovery).toBe(false);
  });

  it("projects pins with city fence and no starter-four ids", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-chapter-discovery-pins.json"), "utf8")
    );
    const result = validateDocketChapterDiscoveryPins(raw);
    expect(result.ok).toBe(true);
    const projected = projectDocketChapterDiscoveryPins(result.doc);
    expect(projected.length).toBeGreaterThanOrEqual(1);
    for (const pin of projected) {
      expect(pin.pollutes_city_discovery).toBe(false);
      expect(pin.branch).toBe("public-docket");
      for (const id of DOCKET_STARTER_CASE_IDS) {
        expect(String(pin.pin_id)).not.toContain(id);
        expect(String(pin.primary_object_id)).not.toContain(`_${id}`);
      }
    }
  });

  it("rejects starter-four pin ids", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-chapter-discovery-pins.json"), "utf8")
    );
    raw.pins[0].id = "altman";
    expect(validateDocketChapterDiscoveryPins(raw).ok).toBe(false);
  });

  it("rejects discovery_opt_in false on chapter publish registry", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-chapter-discovery-pins.json"), "utf8")
    );
    raw.pins[0].live_object.discovery_opt_in = false;
    delete raw.pins[0].live_object.discovery;
    expect(validateDocketChapterDiscoveryPins(raw).ok).toBe(false);
  });

  it("keeps city discovery free of chapter pin markers", () => {
    const city = readFileSync(
      join(dataDir, "discovery-cedar-rapids-iowa.json"),
      "utf8"
    );
    expect(city).not.toContain("chapter-cr-research-circle");
    expect(city).not.toContain("pin_docket_chapter_");
    expect(city).not.toContain("docket_chapter");
  });

  it("ships chapters page", () => {
    expect(DOCKET_CHAPTER_PINS_PAGE_PATH).toBe("/docket/chapters/");
    expect(existsSync(join(root, "site/docket/chapters/index.html"))).toBe(true);
  });
});

describe("ws-docket chapter-pins kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketChapterPinsKitHtml({
      origin: "http://127.0.0.1:8788",
    });
    expect(() => validateWsDocketChapterPinsKitHtml(html)).not.toThrow();
  });

  it("preflight passes when kit + registry + npm scripts are present", () => {
    const html = buildWsDocketChapterPinsKitHtml({
      origin: "http://127.0.0.1:8788",
    });
    writeFileSync(join(root, DOCKET_CHAPTER_PINS_KIT_REL), html);
    const report = assessWsDocketChapterPinsPreflight(root);
    expect(report.engineeringMet).toBe(true);
  });
});

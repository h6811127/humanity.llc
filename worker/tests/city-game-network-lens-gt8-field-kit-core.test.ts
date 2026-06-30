import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildGt8FieldWalkKitHtml,
  formatGt8FieldWalkKitReport,
  GT8_BOARD_FIELD_SCENARIOS,
  productionBoardUrl,
  resolveNetworkLensNextStop,
  validateGt8FieldWalkKitHtml,
} from "../scripts/city-game-network-lens-gt8-field-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

describe("city-game-network-lens-gt8-field-kit-core", () => {
  it("resolveNetworkLensNextStop reads season network_lens", () => {
    const next = resolveNetworkLensNextStop(season);
    expect(next.nodeId).toBe("node_04");
    expect(next.label.length).toBeGreaterThan(0);
  });

  it("productionBoardUrl points at map lens", () => {
    expect(productionBoardUrl(season)).toBe("https://humanity.llc/play/cedar-rapids/map/");
  });

  it("renders GT-8 timer and B1–B7 scenarios", () => {
    const html = buildGt8FieldWalkKitHtml({
      boardUrl: "https://humanity.llc/play/cedar-rapids/map/",
      comprehensionUrl: "https://humanity.llc/play/cedar-rapids/comprehension/",
      nextStop: { nodeId: "node_04", label: "River Lantern" },
      production: true,
    });
    expect(html).toContain("GT-8 · 10 second orientation");
    expect(html).toContain("River Lantern");
    for (const row of GT8_BOARD_FIELD_SCENARIOS) {
      expect(html).toContain(`${row.id} · ${row.title}`);
    }
    const validation = validateGt8FieldWalkKitHtml(html, "test.html");
    expect(validation.ok).toBe(true);
  });

  it("formatGt8FieldWalkKitReport lists operator steps", () => {
    const report = formatGt8FieldWalkKitReport({
      boardUrl: "https://humanity.llc/play/cedar-rapids/map/",
      fieldWalkUrl: "https://humanity.llc/play/cedar-rapids/comprehension/gt8-field-walk.html",
      production: true,
    });
    expect(report).toContain("network-lens-sign-off");
    expect(report).toContain("gt8-field-walk.html");
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  comprehensionGt8GateMet,
  parseComprehensionGt8Passes,
} from "../scripts/city-game-map-board-b13-core.mjs";
import {
  assessNetworkLensSf3Ready,
  applyMapDashboardSf3Gt8Pass,
  networkLensBoardEngineeringOk,
  networkLensRulesPageVisualOk,
  networkLensSf2bEngineeringOk,
} from "../scripts/city-game-network-lens-sf3-core.mjs";
import { MAP_DASHBOARD_SF3_GT8_PENDING } from "../scripts/city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
const boardHtml = buildMapBoardInnerHtml(season);

describe("city-game-network-lens-sf3-core", () => {
  it("parseComprehensionGt8Passes reads GT-8 column from per-tester log", () => {
    const md = `
| Tester | Date | W1–W3 OK? | GT-1 | GT-2 | GT-3 | GT-4 | GT-5 | GT-6 | GT-7 | GT-8 | Pass? |
| 1 | 2026-06-21 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| 2 | 2026-06-21 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ | ☐ |
| 3 | 2026-06-21 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| 4 | 2026-06-21 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| 5 | 2026-06-21 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
`;
    expect(parseComprehensionGt8Passes(md)).toEqual([true, false, true, true, true]);
    expect(comprehensionGt8GateMet(md).met).toBe(true);
    expect(comprehensionGt8GateMet(md).passCount).toBe(4);
  });

  it("network lens board and rules surfaces pass engineering checks", () => {
    expect(networkLensBoardEngineeringOk(boardHtml).ok).toBe(true);
    expect(networkLensRulesPageVisualOk(rulesHtml).ok).toBe(true);
    expect(networkLensSf2bEngineeringOk(boardHtml).ok).toBe(true);
  });

  it("assessNetworkLensSf3Ready is engineering-ready before GT-8 human pass", () => {
    const report = assessNetworkLensSf3Ready({
      season,
      boardHtml,
      rulesHtml,
      b14Ok: true,
      comprehensionRunbook: "",
      mapDashboardDoc: "",
    });
    expect(report.engineeringReady).toBe(true);
    expect(report.humanReady).toBe(false);
    expect(report.ready).toBe(false);
    expect(report.gt8.passCount).toBe(0);
  });

  it("applyMapDashboardSf3Gt8Pass updates launch sign-off row", () => {
    const doc = `| Gate | Status | Date |\n|------|--------|------|\n${MAP_DASHBOARD_SF3_GT8_PENDING}\n`;
    const updated = applyMapDashboardSf3Gt8Pass(doc, {
      dateIso: "2026-06-21",
      detail: "4/5 testers",
    });
    expect(updated).toContain("☑ **2026-06-21**");
    expect(updated).not.toContain("☐ Pending");
  });
});

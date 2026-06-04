import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyLaunchChecklistP6Pass,
  applyMapDashboardB13PrivacyPass,
  assessMapBoardB13Ready,
  comprehensionGt7GateMet,
  htmlMarketsLiveCityBoard,
  launchChecklistRequiredGates,
  MAP_DASHBOARD_B13_PRIVACY_PENDING,
  parseComprehensionGt7Passes,
  surfacesMarketLiveCityBoard,
  validateComprehensionSignOffPass,
} from "../scripts/city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");

describe("city-game-map-board-b13-core", () => {
  it("detects live city board marketing on rules page", () => {
    expect(htmlMarketsLiveCityBoard(rulesHtml)).toBe(true);
    expect(
      surfacesMarketLiveCityBoard({
        rulesHtml,
        researchHtmlByRel: {},
      })
    ).toBe(true);
  });

  it("parseComprehensionGt7Passes reads per-tester log column", () => {
    const md = `
| Tester | Date | W1–W3 OK? | GT-1 | GT-2 | GT-3 | GT-4 | GT-5 | GT-6 | GT-7 | Pass? |
| 1 | 2026-06-04 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |
| 2 | 2026-06-04 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ | ☐ |
`;
    expect(parseComprehensionGt7Passes(md)).toEqual([true, false]);
    expect(comprehensionGt7GateMet(md, 2).met).toBe(false);
    const allPass = md.replace(
      "| 2 | 2026-06-04 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ | ☐ |",
      "| 2 | 2026-06-04 | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ |"
    );
    expect(comprehensionGt7GateMet(allPass, 2).met).toBe(true);
  });

  it("requires P6 on launch checklist when live board marketed", () => {
    expect(launchChecklistRequiredGates(true)).toContain("P6");
    expect(launchChecklistRequiredGates(false)).not.toContain("P6");
  });

  it("blocks B13 when marketed without GT-7 and privacy", () => {
    const b13 = assessMapBoardB13Ready({
      marketsLiveCityBoard: true,
      b14Ok: true,
      comprehensionRunbook: "| 1 | | | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |",
      mapDashboardDoc: MAP_DASHBOARD_B13_PRIVACY_PENDING,
      launchChecklistDoc: "",
    });
    expect(b13.required).toBe(true);
    expect(b13.ready).toBe(false);
    expect(b13.issues.some((i) => i.includes("GT-7"))).toBe(true);
    expect(b13.issues.some((i) => i.includes("privacy"))).toBe(true);
  });

  it("validateComprehensionSignOffPass requires GT-7 when marketed", () => {
    const fail = validateComprehensionSignOffPass({
      marketsLiveCityBoard: true,
      runbook: "| 1 | | | ☑ | ☑ | ☑ | ☑ | ☑ | ☑ | ☐ | ☐ |",
    });
    expect(fail.ok).toBe(false);
    const ok = validateComprehensionSignOffPass({
      marketsLiveCityBoard: false,
      runbook: "",
    });
    expect(ok.ok).toBe(true);
  });

  it("apply helpers mark privacy and P6 rows", () => {
    let mapDoc = `## Launch sign-off (B13 / P6)\n\n| Gate | Status | Date |\n|------|--------|------|\n${MAP_DASHBOARD_B13_PRIVACY_PENDING}\n`;
    mapDoc = applyMapDashboardB13PrivacyPass(mapDoc, {
      dateIso: "2026-06-04",
      detail: "Reviewer",
    });
    expect(mapDoc).toContain("☑ **2026-06-04**");

    const launchDoc = readFileSync(join(root, "docs/CITY_GAME_LAUNCH_CHECKLIST.md"), "utf8");
    const updated = applyLaunchChecklistP6Pass(launchDoc, { dateIso: "2026-06-04" });
    expect(updated).toContain("P6 |");
    expect(updated).toMatch(/P6 \|.*☑/);
  });
});

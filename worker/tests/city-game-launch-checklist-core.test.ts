import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  applyLaunchChecklistC5Pass,
  applyLaunchChecklistRowPass,
  assessLaunchChecklistReady,
  launchChecklistC5Signed,
  launchChecklistGateSigned,
  launchChecklistRowIsSigned,
  LAUNCH_CHECKLIST_C5_PENDING,
  LAUNCH_CHECKLIST_O1_PENDING,
  LAUNCH_CHECKLIST_P4_PENDING,
  parseLaunchChecklistSignOffArgs,
  resolveLaunchChecklistSignOffResult,
} from "../scripts/city-game-launch-checklist-core.mjs";
import { htmlMarketsLiveCityBoard } from "../scripts/city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const launchChecklistSample = readFileSync(
  join(root, "docs/CITY_GAME_LAUNCH_CHECKLIST.md"),
  "utf8"
);

describe("city-game-launch-checklist-core", () => {
  it("detects signed vs pending checklist rows", () => {
    expect(launchChecklistRowIsSigned("| P3 | Rules page live | ☑ **2026-06-03** |")).toBe(true);
    expect(launchChecklistRowIsSigned("| P1 | comprehension | ☐ |")).toBe(false);
    expect(launchChecklistGateSigned(launchChecklistSample, "P3")).toBe(true);
    expect(launchChecklistGateSigned(launchChecklistSample, "P1")).toBe(true);
  });

  it("assesses pending gates before launch day", () => {
    const result = assessLaunchChecklistReady({
      launchChecklistDoc: launchChecklistSample,
      scanAnalyticsGateOk: true,
    });
    expect(result.allRequiredSigned).toBe(false);
    expect(result.pending).toEqual(["P2", "O2"]);
    expect(result.pending).not.toContain("P1");
    expect(result.pending).not.toContain("O1");
    expect(result.readyForLaunchDay).toBe(false);
    expect(result.blockers.some((b) => b.includes("pending"))).toBe(true);
  });

  it("includes P6 when live city board is marketed", () => {
    const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
    expect(htmlMarketsLiveCityBoard(rulesHtml)).toBe(true);
    const result = assessLaunchChecklistReady({
      launchChecklistDoc: launchChecklistSample,
      scanAnalyticsGateOk: true,
      marketsLiveCityBoard: true,
      mapBoardB13Ready: false,
    });
    expect(result.pending).toContain("P6");
    expect(result.readyForLaunchDay).toBe(false);
  });

  it("marks individual ops rows", () => {
    const updated = applyLaunchChecklistRowPass(launchChecklistSample, "O1", {
      dateIso: "2026-06-04",
    });
    expect(updated).not.toContain(LAUNCH_CHECKLIST_O1_PENDING);
    expect(launchChecklistGateSigned(updated, "O1")).toBe(true);
  });

  it("signs C5 when all required gates are marked", () => {
    let doc = launchChecklistSample;
    for (const gate of ["P1", "P2", "P4", "P5", "O1", "O2", "O3", "O4"]) {
      doc = applyLaunchChecklistRowPass(doc, gate, { dateIso: "2026-06-04" });
    }
    const ready = assessLaunchChecklistReady({ launchChecklistDoc: doc });
    expect(ready.allRequiredSigned).toBe(true);
    expect(ready.c5Signed).toBe(false);

    doc = applyLaunchChecklistC5Pass(doc, {
      dateIso: "2026-06-04",
      commander: "Ops lead",
    });
    expect(launchChecklistC5Signed(doc)).toBe(true);
    expect(doc).toContain("Launch checklist **signed**");
    expect(
      assessLaunchChecklistReady({ launchChecklistDoc: doc }).readyForLaunchDay
    ).toBe(true);
  });

  it("parses sign-off CLI args", () => {
    const parsed = parseLaunchChecklistSignOffArgs([
      "--mark",
      "O1",
      "O2",
      "--apply",
      "--date",
      "2026-06-05",
    ]);
    expect(parsed.mark).toEqual(["O1", "O2"]);
    expect(parsed.dateIso).toBe("2026-06-05");
    expect(resolveLaunchChecklistSignOffResult(parsed)).toBe("mark");
  });

  it("tracks signed P4/O1 and pending C5 in canonical checklist", () => {
    expect(launchChecklistSample).not.toContain(LAUNCH_CHECKLIST_P4_PENDING);
    expect(launchChecklistGateSigned(launchChecklistSample, "P4")).toBe(true);
    expect(launchChecklistGateSigned(launchChecklistSample, "O1")).toBe(true);
    expect(launchChecklistSample).toContain(LAUNCH_CHECKLIST_C5_PENDING);
    expect(launchChecklistC5Signed(launchChecklistSample)).toBe(false);
  });
});

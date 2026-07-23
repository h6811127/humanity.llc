import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assessInstallPackReady,
  buildInstallChecklistText,
  buildInstallPackCsv,
  buildInstallPackRows,
  installPackCsvFilename,
  installPackQrFilename,
  installPackSummaryCopy,
  isInstallPackStateCurrent,
} from "../../site/js/created-child-object-game-node-print-pack-core.mjs";
import { resolveSeasonTemplateRows } from "../../site/js/city-game-season-template-core.mjs";

const printPackUiSource = readFileSync(
  join(process.cwd(), "site/js/created-child-object-game-node-print-pack.mjs"),
  "utf8"
);

describe("created-child-object-game-node-print-pack-core", () => {
  const seasonId = "example_city_season_01";
  const templateRows = resolveSeasonTemplateRows(null, seasonId);

  it("merges registered nodes with template metadata", () => {
    const objectId = templateRows[0].object_id;
    const rows = buildInstallPackRows(
      [
        {
          object_type: "game_node",
          object_id: objectId,
          public_label: "River lantern",
          qr_id: "qr_test_01",
          scan_url: "https://humanity.llc/c/prof?q=qr_test_01",
          status: "active",
        },
      ],
      templateRows
    );
    expect(rows[0].node_id).toBe("node_01");
    expect(rows[0].qr_issued).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(15);
  });

  it("blocks export when no QRs are issued", () => {
    const assessment = assessInstallPackReady(
      buildInstallPackRows(
        [
          {
            object_type: "game_node",
            object_id: templateRows[0].object_id,
            public_label: "River lantern",
            status: "active",
          },
        ],
        templateRows
      )
    );
    expect(assessment.ready).toBe(false);
    expect(assessment.issues[0]).toMatch(/Issue scan QRs/i);
  });

  it("builds CSV and checklist exports", () => {
    const rows = buildInstallPackRows(
      [
        {
          object_type: "game_node",
          object_id: templateRows[0].object_id,
          public_label: "River lantern",
          qr_id: "qr_test_01",
          scan_url: "https://humanity.llc/c/prof?q=qr_test_01",
          status: "active",
        },
      ],
      templateRows.slice(0, 1)
    );
    const csv = buildInstallPackCsv(rows);
    expect(csv).toContain("node_id,label");
    expect(csv).toContain("qr_test_01");

    const checklist = buildInstallChecklistText(
      { seasonId, seasonTitle: "Wake the grid", profileId: "prof_example" },
      rows
    );
    expect(checklist).toContain("Install pack");
    expect(checklist).toContain("node_01");
    expect(checklist).toContain("Install QA");
  });

  it("formats stable download filenames", () => {
    expect(installPackQrFilename("example_city_season_01", "node_04")).toBe(
      "humanity-example_city_season_01-node_04-qr.png"
    );
    expect(installPackCsvFilename("example_city_season_01")).toBe(
      "humanity-example_city_season_01-install-pack.csv"
    );
  });

  it("summarizes pack readiness for UI copy", () => {
    expect(
      installPackSummaryCopy({ ready: false, issues: [], withQr: 0, total: 0, missingQr: [] })
    ).toMatch(/Register game nodes/);
    expect(
      installPackSummaryCopy({ ready: true, issues: [], withQr: 15, total: 15, missingQr: [] })
    ).toMatch(/15 nodes ready/);
  });

  it("uses loaded pack state only for the selected season and latest request", () => {
    const loaded = { seasonId: "season_a", requestId: 3 };
    expect(isInstallPackStateCurrent(loaded, "season_a", 3)).toBe(true);
    expect(isInstallPackStateCurrent(loaded, "season_b", 3)).toBe(false);
    expect(isInstallPackStateCurrent(loaded, "season_a", 4)).toBe(false);
    expect(isInstallPackStateCurrent(null, "season_a", 3)).toBe(false);
  });

  it("invalidates stale rows before fetch and guards every export listener", () => {
    const refreshStart = printPackUiSource.indexOf("async function refresh()");
    const fetchStart = printPackUiSource.indexOf("await loadSeasonBody", refreshStart);
    const beforeFetch = printPackUiSource.slice(refreshStart, fetchStart);
    expect(beforeFetch).toContain("loadedPackState = null");
    expect(beforeFetch).toContain("renderTable([])");
    expect(beforeFetch).toContain("setButtonsEnabled()");
    expect(printPackUiSource.slice(fetchStart, fetchStart + 400)).toContain(
      "if (!isInstallPackStateCurrent(candidateState, selectedSeasonId(), latestRequestId)) return"
    );

    const handlerMarkers = [
      'tableWrap?.addEventListener("click"',
      'csvBtn?.addEventListener("click"',
      'checklistBtn?.addEventListener("click"',
      'downloadAllBtn?.addEventListener("click"',
    ];
    for (const marker of handlerMarkers) {
      const start = printPackUiSource.indexOf(marker);
      expect(start, marker).toBeGreaterThan(-1);
      expect(printPackUiSource.slice(start, start + 300), marker).toContain("hasCurrentPack()");
    }
  });
});

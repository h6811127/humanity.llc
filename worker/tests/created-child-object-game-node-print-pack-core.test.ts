import { describe, expect, it } from "vitest";

import {
  assessInstallPackReady,
  buildInstallChecklistText,
  buildInstallPackCsv,
  buildInstallPackRows,
  installPackCsvFilename,
  installPackQrFilename,
  installPackSummaryCopy,
} from "../../site/js/created-child-object-game-node-print-pack-core.mjs";
import { resolveSeasonTemplateRows } from "../../site/js/city-game-season-template-core.mjs";

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
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  auditMapBoardPrivacyEngineering,
  auditMapBoardSurfaceCopy,
  auditSeasonSnapshotPrivacy,
} from "../scripts/city-game-map-board-privacy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
const snapshotFixture = JSON.parse(
  readFileSync(
    join(root, "worker/tests/fixtures/city-game-snapshot-empty-board.json"),
    "utf8"
  )
);

describe("city-game-map-board-privacy-core", () => {
  it("passes empty-board snapshot fixture", () => {
    const audit = auditSeasonSnapshotPrivacy(snapshotFixture);
    expect(audit.ok).toBe(true);
    expect(audit.issues).toEqual([]);
  });

  it("flags forbidden snapshot keys and surveillance copy", () => {
    const bad = auditSeasonSnapshotPrivacy({
      ...snapshotFixture,
      nodes: [{ node_id: "node_01", player_id: "abc" }],
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues.some((i) => i.includes("player_id"))).toBe(true);

    const copyBad = auditSeasonSnapshotPrivacy({
      ...snapshotFixture,
      headlines: ["Your progress is 3/5"],
    });
    expect(copyBad.ok).toBe(false);
  });

  it("audits Cedar Rapids rules page + snapshot fixture", () => {
    const audit = auditMapBoardPrivacyEngineering({
      snapshot: snapshotFixture,
      rulesHtml,
    });
    expect(audit.ok).toBe(true);
  });

  it("flags surveillance copy on map surfaces", () => {
    const surface = auditMapBoardSurfaceCopy(
      "<p>Your progress is visible on the board</p>",
      "test"
    );
    expect(surface.ok).toBe(false);
  });

  it("allows negated surveillance copy on rules-style pages", () => {
    const surface = auditMapBoardSurfaceCopy(
      "<li>No leaderboard, streak, or player dossier built from scans</li>",
      "rules"
    );
    expect(surface.ok).toBe(true);
  });
});

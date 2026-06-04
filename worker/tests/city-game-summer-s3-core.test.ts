import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  mergeSummerS3,
  mergeSummerS3BulletinSchedule,
  SUMMER_S3_BULLETIN_NODE_IDS,
  SUMMER_S3_FRIDAY_INTERVAL_HOURS,
  validateSeasonSummerS3,
} from "../scripts/city-game-summer-s3-core.mjs";
import { seasonWithSummerS2Nodes } from "../scripts/city-game-summer-s2-core.mjs";
import {
  applyBulletinScheduleToStreams,
  resolveActiveBulletinSlot,
} from "../src/city-game/bulletin-schedule";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);
const seasonS3 = mergeSummerS3(seasonWithSummerS2Nodes(season));

describe("city-game-summer-s3-core (CR-E02 / SW-10)", () => {
  it("committed season passes summer S3 validation", () => {
    const result = validateSeasonSummerS3(seasonS3);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("resolves week-1 Friday bulletin on node_21 after season start", () => {
    const slot = resolveActiveBulletinSlot(
      "node_21",
      new Date("2026-06-13T18:00:00-05:00"),
      seasonS3
    );
    expect(slot?.bulletin).toContain("Friday whisper");
  });

  it("applies mid-season bulletin on hot relay node_31", () => {
    const streams = applyBulletinScheduleToStreams(
      [
        { id: "bulletin", class: "narrative", label: "Bulletin", value: "Stored" },
        { id: "relay", class: "route", label: "Relay status", value: "Closed" },
        { id: "territory", class: "place", label: "Controller", value: "Unclaimed" },
      ],
      "node_31",
      new Date("2026-06-28T12:00:00-05:00"),
      seasonS3,
      {
        nodeRole: "relay_gate",
        gameMeta: { compromised: false } as never,
        seasonWindowPhase: "open",
      }
    );
    expect(streams.find((s) => s.id === "bulletin")?.value).toContain("Commons tragedy");
  });

  it("merge replaces anchor bulletin entries from canon beats", () => {
    const merged = mergeSummerS3BulletinSchedule({
      ...seasonS3,
      bulletin_schedule: { entries: [] },
    });
    for (const nodeId of SUMMER_S3_BULLETIN_NODE_IDS) {
      const entry = merged.bulletin_schedule.entries.find(
        (e: { node_id: string }) => e.node_id === nodeId
      );
      expect(entry?.slots?.length).toBeGreaterThanOrEqual(5);
      const weekly = entry.slots.filter(
        (s: { after_start_hours: number }) =>
          s.after_start_hours % SUMMER_S3_FRIDAY_INTERVAL_HOURS === 0
      );
      expect(weekly.length).toBeGreaterThanOrEqual(5);
    }
  });
});

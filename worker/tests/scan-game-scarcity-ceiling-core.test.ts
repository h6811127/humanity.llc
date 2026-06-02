import { describe, expect, it } from "vitest";

import {
  SCARCITY_CEILING_STORAGE_KEY,
  buildScarcityCeilingRecord,
  deviceHasScarcityClaimToday,
  parseScarcityCeilingRecord,
  scarcityCeilingRecordMatches,
  scarcityCeilingUtcDateKey,
  serializeScarcityCeilingRecord,
} from "../../site/js/scan-game-scarcity-ceiling-core.mjs";

const SEASON = "cr_season_01_wake";
const WITNESS = "obj_cr_node_10_library";
const DAY = "2026-06-02T03:15:00.000Z";

describe("scan-game-scarcity-ceiling-core", () => {
  it("uses stable storage key constant", () => {
    expect(SCARCITY_CEILING_STORAGE_KEY).toBe("hc_game_scarcity_ceiling_v1");
  });

  it("derives UTC date bucket aligned with server contribute buckets", () => {
    expect(scarcityCeilingUtcDateKey(new Date(DAY))).toBe("2026-06-02");
    expect(scarcityCeilingUtcDateKey(new Date("2026-06-01T23:30:00-06:00"))).toBe("2026-06-02");
  });

  it("builds and serializes a valid record", () => {
    const record = buildScarcityCeilingRecord(
      SEASON,
      WITNESS,
      "2026-06-02",
      new Date(DAY)
    );
    expect(record).toEqual({
      season_id: SEASON,
      object_id: WITNESS,
      bucket_date: "2026-06-02",
      claimed_at: DAY,
    });
    expect(parseScarcityCeilingRecord(serializeScarcityCeilingRecord(record))).toEqual(record);
  });

  it("rejects malformed stored JSON", () => {
    expect(parseScarcityCeilingRecord("")).toBeNull();
    expect(parseScarcityCeilingRecord("{")).toBeNull();
    expect(parseScarcityCeilingRecord(JSON.stringify({ season_id: SEASON }))).toBeNull();
    expect(
      parseScarcityCeilingRecord(
        JSON.stringify({
          season_id: SEASON,
          object_id: WITNESS,
          bucket_date: "not-a-date",
        })
      )
    ).toBeNull();
  });

  it("matches record only for same season, object, and UTC day", () => {
    const record = buildScarcityCeilingRecord(SEASON, WITNESS, "2026-06-02", new Date(DAY));
    expect(scarcityCeilingRecordMatches(record, SEASON, WITNESS, "2026-06-02")).toBe(true);
    expect(scarcityCeilingRecordMatches(record, SEASON, WITNESS, "2026-06-03")).toBe(false);
    expect(scarcityCeilingRecordMatches(record, SEASON, "obj_other", "2026-06-02")).toBe(false);
    expect(scarcityCeilingRecordMatches(record, "other_season", WITNESS, "2026-06-02")).toBe(false);
  });

  it("detects device claim for current UTC bucket only", () => {
    const now = new Date(DAY);
    const raw = serializeScarcityCeilingRecord(
      buildScarcityCeilingRecord(SEASON, WITNESS, "2026-06-02", now)
    );
    expect(deviceHasScarcityClaimToday(raw, SEASON, WITNESS, now)).toBe(true);
    expect(deviceHasScarcityClaimToday(raw, SEASON, WITNESS, new Date("2026-06-03T01:00:00.000Z"))).toBe(
      false
    );
    expect(deviceHasScarcityClaimToday(raw, SEASON, "obj_cr_node_04_river", now)).toBe(false);
  });

  it("throws on invalid build inputs", () => {
    expect(() => buildScarcityCeilingRecord("", WITNESS, "2026-06-02")).toThrow();
    expect(() => buildScarcityCeilingRecord(SEASON, WITNESS, "bad")).toThrow();
  });
});

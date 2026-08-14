import { describe, expect, it } from "vitest";

import {
  GAME_CONTRIBUTE_OBJECT_DAILY_CAP,
  gameContributeObjectDailyCapReached,
  incrementGameContributeBucket,
} from "../src/db/game-contribute";

const OBJECT_A = "obj_door_1";
const OBJECT_B = "obj_door_2";
const SEASON = "cr-season-01";
const DAY = "2026-08-14";

class FakeContributeDb {
  buckets = new Map<string, number>();

  private key(objectId: string, seasonId: string, bucketDate: string) {
    return `${objectId}|${seasonId}|${bucketDate}`;
  }

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        const [objectId, seasonId, bucketDate] = args as [string, string, string];
        const key = self.key(objectId, seasonId, bucketDate);
        return {
          async first<T>() {
            if (sql.includes("FROM game_contribute_buckets")) {
              const count = self.buckets.get(key);
              return (count == null ? null : { contribution_count: count }) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("UPDATE game_contribute_buckets")) {
              const current = self.buckets.get(key);
              if (current != null) self.buckets.set(key, current + 1);
              return { success: true, meta: { changes: current == null ? 0 : 1 } };
            }
            if (sql.includes("INSERT INTO game_contribute_buckets")) {
              self.buckets.set(key, 1);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeContributeDb): D1Database {
  return fake as unknown as D1Database;
}

describe("game contribute daily bucket", () => {
  it("creates a bucket on first write and increments the same object/season/day", async () => {
    const fake = new FakeContributeDb();
    expect(await incrementGameContributeBucket(db(fake), OBJECT_A, SEASON, DAY)).toBe(1);
    expect(await incrementGameContributeBucket(db(fake), OBJECT_A, SEASON, DAY)).toBe(2);
    expect(await incrementGameContributeBucket(db(fake), OBJECT_A, SEASON, DAY)).toBe(3);
    expect(fake.buckets.get(`${OBJECT_A}|${SEASON}|${DAY}`)).toBe(3);
  });

  it("isolates buckets by object, season, and date", async () => {
    const fake = new FakeContributeDb();
    await incrementGameContributeBucket(db(fake), OBJECT_A, SEASON, DAY);
    expect(await incrementGameContributeBucket(db(fake), OBJECT_B, SEASON, DAY)).toBe(1);
    expect(await incrementGameContributeBucket(db(fake), OBJECT_A, "other-season", DAY)).toBe(1);
    expect(await incrementGameContributeBucket(db(fake), OBJECT_A, SEASON, "2026-08-15")).toBe(1);
    expect(fake.buckets.get(`${OBJECT_A}|${SEASON}|${DAY}`)).toBe(1);
  });

  it("reports the object daily cap only at or above 2000 for that bucket", async () => {
    const fake = new FakeContributeDb();
    expect(GAME_CONTRIBUTE_OBJECT_DAILY_CAP).toBe(2000);
    expect(await gameContributeObjectDailyCapReached(db(fake), OBJECT_A, SEASON, DAY)).toBe(false);

    fake.buckets.set(`${OBJECT_A}|${SEASON}|${DAY}`, 1999);
    expect(await gameContributeObjectDailyCapReached(db(fake), OBJECT_A, SEASON, DAY)).toBe(false);

    fake.buckets.set(`${OBJECT_A}|${SEASON}|${DAY}`, 2000);
    expect(await gameContributeObjectDailyCapReached(db(fake), OBJECT_A, SEASON, DAY)).toBe(true);

    fake.buckets.set(`${OBJECT_B}|${SEASON}|${DAY}`, 2000);
    expect(await gameContributeObjectDailyCapReached(db(fake), OBJECT_A, SEASON, "2026-08-15")).toBe(
      false
    );
  });
});

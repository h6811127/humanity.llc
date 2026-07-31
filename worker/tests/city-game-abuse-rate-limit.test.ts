import { describe, expect, it } from "vitest";

import {
  GAME_CONTRIBUTE_LIMIT_PER_HOUR,
  RELAY_OFFER_LIMIT_PER_HOUR,
  SEASON_SNAPSHOT_LIMIT_PER_MINUTE,
  checkGameContributeRateLimit,
  checkRelayOfferRateLimit,
  checkSeasonSnapshotRateLimit,
  hashIp,
} from "../src/db/rate-limit";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

describe("city-game abuse rate limits", () => {
  it("blocks season snapshot polls at SEASON_SNAPSHOT_LIMIT_PER_MINUTE", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.40");
    const fixedNow = new Date("2026-07-31T10:15:30.000Z");

    for (let i = 0; i < SEASON_SNAPSHOT_LIMIT_PER_MINUTE; i += 1) {
      const rate = await checkSeasonSnapshotRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkSeasonSnapshotRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("isolates season snapshot buckets per IP", async () => {
    const database = rateLimitDb();
    const a = await hashIp("203.0.113.41");
    const b = await hashIp("203.0.113.42");
    const fixedNow = new Date("2026-07-31T10:16:00.000Z");

    for (let i = 0; i < SEASON_SNAPSHOT_LIMIT_PER_MINUTE; i += 1) {
      await checkSeasonSnapshotRateLimit(database, a, fixedNow);
    }

    const stillAllowed = await checkSeasonSnapshotRateLimit(database, b, fixedNow);
    expect(stillAllowed.allowed).toBe(true);
  });

  it("blocks game contribute at GAME_CONTRIBUTE_LIMIT_PER_HOUR", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.43");
    const fixedNow = new Date("2026-07-31T10:45:00.000Z");

    for (let i = 0; i < GAME_CONTRIBUTE_LIMIT_PER_HOUR; i += 1) {
      const rate = await checkGameContributeRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkGameContributeRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(15 * 60);
  });

  it("blocks relay offers at RELAY_OFFER_LIMIT_PER_HOUR", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.44");
    const fixedNow = new Date("2026-07-31T11:30:00.000Z");

    for (let i = 0; i < RELAY_OFFER_LIMIT_PER_HOUR; i += 1) {
      const rate = await checkRelayOfferRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkRelayOfferRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(30 * 60);
  });

  it("keeps contribute and relay offer buckets independent", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.45");
    const fixedNow = new Date("2026-07-31T12:00:00.000Z");

    for (let i = 0; i < RELAY_OFFER_LIMIT_PER_HOUR; i += 1) {
      await checkRelayOfferRateLimit(database, ipHash, fixedNow);
    }

    const contribute = await checkGameContributeRateLimit(database, ipHash, fixedNow);
    expect(contribute.allowed).toBe(true);

    const relayBlocked = await checkRelayOfferRateLimit(database, ipHash, fixedNow);
    expect(relayBlocked.allowed).toBe(false);
  });
});

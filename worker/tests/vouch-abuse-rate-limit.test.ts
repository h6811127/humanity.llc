import { describe, expect, it } from "vitest";

import {
  VOUCH_APPEAL_LIMIT_PER_HOUR,
  VOUCH_REPORT_LIMIT_PER_HOUR,
  checkVouchAppealRateLimit,
  checkVouchReportRateLimit,
  hashIp,
} from "../src/db/rate-limit";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

function rateLimitDb(): D1Database {
  const store = new RateLimitBucketStore();
  return { prepare: (sql: string) => store.prepare(sql) } as unknown as D1Database;
}

describe("vouch abuse rate limits", () => {
  it("blocks public vouch reports at VOUCH_REPORT_LIMIT_PER_HOUR", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.50");
    const fixedNow = new Date("2026-08-10T10:30:00.000Z");

    for (let i = 0; i < VOUCH_REPORT_LIMIT_PER_HOUR; i += 1) {
      const rate = await checkVouchReportRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkVouchReportRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(30 * 60);
  });

  it("blocks vouch appeals at VOUCH_APPEAL_LIMIT_PER_HOUR", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.51");
    const fixedNow = new Date("2026-08-10T10:45:00.000Z");

    for (let i = 0; i < VOUCH_APPEAL_LIMIT_PER_HOUR; i += 1) {
      const rate = await checkVouchAppealRateLimit(database, ipHash, fixedNow);
      expect(rate.allowed).toBe(true);
    }

    const blocked = await checkVouchAppealRateLimit(database, ipHash, fixedNow);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(15 * 60);
  });

  it("isolates report and appeal buckets for the same IP", async () => {
    const database = rateLimitDb();
    const ipHash = await hashIp("203.0.113.52");
    const fixedNow = new Date("2026-08-10T11:00:00.000Z");

    for (let i = 0; i < VOUCH_REPORT_LIMIT_PER_HOUR; i += 1) {
      await checkVouchReportRateLimit(database, ipHash, fixedNow);
    }

    const appeal = await checkVouchAppealRateLimit(database, ipHash, fixedNow);
    expect(appeal.allowed).toBe(true);

    const reportBlocked = await checkVouchReportRateLimit(database, ipHash, fixedNow);
    expect(reportBlocked.allowed).toBe(false);
  });

  it("isolates vouch report buckets per IP", async () => {
    const database = rateLimitDb();
    const a = await hashIp("203.0.113.53");
    const b = await hashIp("203.0.113.54");
    const fixedNow = new Date("2026-08-10T11:10:00.000Z");

    for (let i = 0; i < VOUCH_REPORT_LIMIT_PER_HOUR; i += 1) {
      await checkVouchReportRateLimit(database, a, fixedNow);
    }

    const stillAllowed = await checkVouchReportRateLimit(database, b, fixedNow);
    expect(stillAllowed.allowed).toBe(true);
  });
});

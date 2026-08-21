import { describe, expect, it } from "vitest";

import {
  incrementMerchFunnelCounter,
  listMerchFunnelCountersSince,
  sumMerchFunnelCounter,
} from "../src/db/merch-funnel";

class FakeMerchFunnelCounterDb {
  private counters = new Map<string, { ref: string; event: string; day: string; count: number }>();

  prepare(sql: string) {
    const counters = this.counters;
    return {
      bind(...args: unknown[]) {
        return {
          async run() {
            if (!sql.includes("INSERT INTO merch_funnel_counters")) return;
            const ref = String(args[0]);
            const event = String(args[1]);
            const day = String(args[2]);
            const key = `${ref}|${event}|${day}`;
            const existing = counters.get(key);
            if (existing) {
              existing.count += 1;
              return;
            }
            counters.set(key, { ref, event, day, count: 1 });
          },
          async first<T>() {
            if (!sql.includes("COALESCE(SUM(count), 0)")) return null as T | null;
            const ref = String(args[0]);
            const event = String(args[1]);
            const sinceDay = String(args[2]);
            let total = 0;
            for (const row of counters.values()) {
              if (row.ref !== ref || row.event !== event || row.day < sinceDay) continue;
              total += row.count;
            }
            return { total } as T;
          },
          async all<T>() {
            if (!sql.includes("FROM merch_funnel_counters")) {
              return { results: [] } as T;
            }
            const sinceDay = String(args[0]);
            const rows = [...counters.values()]
              .filter((row) => row.day >= sinceDay)
              .sort((a, b) => {
                if (a.day !== b.day) return a.day < b.day ? -1 : 1;
                if (a.ref !== b.ref) return a.ref < b.ref ? -1 : 1;
                if (a.event !== b.event) return a.event < b.event ? -1 : 1;
                return 0;
              })
              .map((row) => ({ ...row }));
            return { results: rows } as T;
          },
        };
      },
    };
  }
}

function merchFunnelDb(): D1Database {
  return new FakeMerchFunnelCounterDb() as unknown as D1Database;
}

describe("merch funnel counters (D1)", () => {
  it("increments the same UTC day and sums only that ref+event window", async () => {
    const db = merchFunnelDb();
    const dayA = new Date("2026-05-10T12:00:00.000Z");
    const dayB = new Date("2026-05-12T08:00:00.000Z");

    await incrementMerchFunnelCounter(db, "tier0_sticker", "scan_landing", dayA);
    await incrementMerchFunnelCounter(db, "tier0_sticker", "scan_landing", dayA);
    await incrementMerchFunnelCounter(db, "tier0_sticker", "create_attributed", dayA);
    await incrementMerchFunnelCounter(db, "tier0_shop", "scan_landing", dayA);
    await incrementMerchFunnelCounter(db, "tier0_sticker", "scan_landing", dayB);

    expect(await sumMerchFunnelCounter(db, "tier0_sticker", "scan_landing", "2026-05-10")).toBe(3);
    expect(await sumMerchFunnelCounter(db, "tier0_sticker", "scan_landing", "2026-05-11")).toBe(1);
    expect(await sumMerchFunnelCounter(db, "tier0_sticker", "create_attributed", "2026-05-10")).toBe(
      1
    );
    expect(await sumMerchFunnelCounter(db, "tier0_shop", "scan_landing", "2026-05-10")).toBe(1);
    expect(await sumMerchFunnelCounter(db, "tier0_glitch", "scan_landing", "2026-05-10")).toBe(0);
  });

  it("lists rows on or after sinceDay in day/ref/event order", async () => {
    const db = merchFunnelDb();
    await incrementMerchFunnelCounter(
      db,
      "tier0_shop",
      "scan_landing",
      new Date("2026-05-11T00:00:00.000Z")
    );
    await incrementMerchFunnelCounter(
      db,
      "tier0_sticker",
      "create_attributed",
      new Date("2026-05-10T23:00:00.000Z")
    );
    await incrementMerchFunnelCounter(
      db,
      "tier0_sticker",
      "scan_landing",
      new Date("2026-05-10T01:00:00.000Z")
    );
    await incrementMerchFunnelCounter(
      db,
      "tier0_sticker",
      "scan_landing",
      new Date("2026-05-09T22:00:00.000Z")
    );

    expect(await listMerchFunnelCountersSince(db, "2026-05-10")).toEqual([
      { ref: "tier0_sticker", event: "create_attributed", day: "2026-05-10", count: 1 },
      { ref: "tier0_sticker", event: "scan_landing", day: "2026-05-10", count: 1 },
      { ref: "tier0_shop", event: "scan_landing", day: "2026-05-11", count: 1 },
    ]);
  });

  it("returns an empty list and zero sum when no rows match", async () => {
    const db = merchFunnelDb();
    expect(await listMerchFunnelCountersSince(db, "2026-05-01")).toEqual([]);
    expect(await sumMerchFunnelCounter(db, "tier0_sticker", "scan_landing", "2026-05-01")).toBe(0);
  });
});

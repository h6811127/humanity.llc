import { describe, expect, it } from "vitest";

import { findOrphanProfileIds, runOrphanPurge } from "../src/db/orphan-purge";

const NOW = new Date("2026-05-25T12:00:00.000Z");
const OLD = "2025-01-01T00:00:00.000Z";
const RECENT = "2026-04-01T00:00:00.000Z";
const EXPIRED_QR = "2025-06-01T00:00:00.000Z";

type CardRow = {
  profile_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type SummaryRow = { profile_id: string; vouch_count: number };

type QrRow = {
  profile_id: string;
  status: string;
  expires_at: string | null;
};

type VouchRow = {
  vouchee_profile_id: string;
  voucher_profile_id: string;
  status: string;
};

function makeDb(state: {
  cards?: CardRow[];
  summaries?: SummaryRow[];
  qrs?: QrRow[];
  vouches?: VouchRow[];
  deleted?: string[];
}) {
  const cards = state.cards ?? [];
  const summaries = state.summaries ?? [];
  const qrs = state.qrs ?? [];
  const vouches = state.vouches ?? [];
  const deleted = state.deleted ?? [];

  const db = {
    prepare(sql: string) {
      const binds: unknown[] = [];
      return {
        bind(...args: unknown[]) {
          binds.push(...args);
          return this;
        },
        async all<T>() {
          const cutoff = binds[0] as string;
          const nowIso = binds[1] as string;
          const limit = binds[2] as number;

          if (sql.includes("SELECT c.profile_id")) {
            const ids = cards
              .filter((c) => {
                if (c.status !== "active") return false;
                if (c.created_at >= cutoff) return false;
                if (c.updated_at !== c.created_at) return false;
                const sum = summaries.find((s) => s.profile_id === c.profile_id);
                if (sum && sum.vouch_count > 0) return false;
                if (
                  vouches.some(
                    (v) =>
                      v.status === "active" &&
                      (v.vouchee_profile_id === c.profile_id ||
                        v.voucher_profile_id === c.profile_id)
                  )
                ) {
                  return false;
                }
                const liveQr = qrs.some(
                  (q) =>
                    q.profile_id === c.profile_id &&
                    q.status === "active" &&
                    (q.expires_at === null || q.expires_at > nowIso)
                );
                if (liveQr) return false;
                return true;
              })
              .map((c) => c.profile_id)
              .slice(0, limit);
            return { results: ids.map((profile_id) => ({ profile_id })) as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          const profileId = binds[0] as string;
          if (sql.startsWith("DELETE FROM cards")) {
            deleted.push(profileId);
            const i = cards.findIndex((c) => c.profile_id === profileId);
            if (i >= 0) cards.splice(i, 1);
          }
          return { success: true, meta: { changes: 1 } };
        },
      };
    },
    async batch(stmts: { run: () => Promise<{ success: boolean; error?: string }> }[]) {
      for (const s of stmts) {
        const r = await s.run();
        if (!r.success) return [{ success: false, error: r.error }];
      }
      return stmts.map(() => ({ success: true }));
    },
  };

  return { db: db as unknown as D1Database, deleted, cards };
}

describe("orphan purge", () => {
  it("finds old active cards with no vouches and no live QR", async () => {
    const { db } = makeDb({
      cards: [
        {
          profile_id: "orphan_one",
          status: "active",
          created_at: OLD,
          updated_at: OLD,
        },
        {
          profile_id: "still_live_qr",
          status: "active",
          created_at: OLD,
          updated_at: OLD,
        },
      ],
      summaries: [
        { profile_id: "orphan_one", vouch_count: 0 },
        { profile_id: "still_live_qr", vouch_count: 0 },
      ],
      qrs: [
        {
          profile_id: "still_live_qr",
          status: "active",
          expires_at: "2027-01-01T00:00:00.000Z",
        },
        {
          profile_id: "orphan_one",
          status: "expired",
          expires_at: EXPIRED_QR,
        },
      ],
    });

    const ids = await findOrphanProfileIds(db, { now: NOW, minAgeDays: 90 });
    expect(ids).toEqual(["orphan_one"]);
  });

  it("excludes recently created and owner-updated cards", async () => {
    const { db } = makeDb({
      cards: [
        {
          profile_id: "too_new",
          status: "active",
          created_at: RECENT,
          updated_at: RECENT,
        },
        {
          profile_id: "was_updated",
          status: "active",
          created_at: OLD,
          updated_at: "2025-02-01T00:00:00.000Z",
        },
      ],
      summaries: [
        { profile_id: "too_new", vouch_count: 0 },
        { profile_id: "was_updated", vouch_count: 0 },
      ],
    });

    const ids = await findOrphanProfileIds(db, { now: NOW });
    expect(ids).toEqual([]);
  });

  it("excludes profiles with active vouches", async () => {
    const { db } = makeDb({
      cards: [
        {
          profile_id: "vouched",
          status: "active",
          created_at: OLD,
          updated_at: OLD,
        },
      ],
      summaries: [{ profile_id: "vouched", vouch_count: 0 }],
      vouches: [
        {
          voucher_profile_id: "other",
          vouchee_profile_id: "vouched",
          status: "active",
        },
      ],
    });

    const ids = await findOrphanProfileIds(db, { now: NOW });
    expect(ids).toEqual([]);
  });

  it("runOrphanPurge deletes eligible profiles", async () => {
    const { db, deleted } = makeDb({
      cards: [
        {
          profile_id: "purge_me",
          status: "active",
          created_at: OLD,
          updated_at: OLD,
        },
      ],
      summaries: [{ profile_id: "purge_me", vouch_count: 0 }],
      qrs: [
        {
          profile_id: "purge_me",
          status: "expired",
          expires_at: EXPIRED_QR,
        },
      ],
    });

    const result = await runOrphanPurge(db, { now: NOW, limit: 10 });
    expect(result.purged).toBe(1);
    expect(result.profileIds).toEqual(["purge_me"]);
    expect(deleted).toContain("purge_me");
  });

});

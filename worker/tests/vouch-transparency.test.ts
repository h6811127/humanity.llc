import { describe, expect, it } from "vitest";

import worker from "../src";
import { buildVouchTransparencyCounters } from "../src/db/vouch-transparency";
import { handleGetVouchTransparency } from "../src/resolver/vouch-transparency";

type TableRow = Record<string, unknown>;

class FakeTransparencyDb {
  vouches: TableRow[] = [];
  cases: TableRow[] = [];
  reports: TableRow[] = [];
  suspensions: TableRow[] = [];
  appeals: TableRow[] = [];

  prepare(sql: string) {
    const self = this;
    return {
      bind() {
        return query();
      },
      ...query(),
    };

    function query() {
      return {
        async all<T>() {
          if (sql.includes("FROM verification_summaries")) {
            return { results: [] as T[] };
          }
          if (sql.includes("FROM vouches") && sql.includes("voucher_profile_id")) {
            return { results: self.vouches as T[] };
          }
          if (sql.includes("FROM vouches") && sql.includes("status = 'revoked'")) {
            return {
              results: self.vouches
                .filter((row) => row.status === "revoked")
                .map((row) => ({ vouch_id: row.vouch_id })) as T[],
            };
          }
          if (sql.includes("FROM vouch_cases") && sql.includes("GROUP BY kind")) {
            const rows = sql.includes("WHERE status IN")
              ? self.cases.filter((row) =>
                  ["dismissed", "suspended", "appealed", "closed"].includes(
                    String(row.status)
                  )
                )
              : self.cases;
            return { results: countBy(rows, "kind") as T[] };
          }
          if (
            sql.includes("FROM vouch_cases") &&
            sql.includes("subject_vouch_ids_json")
          ) {
            return {
              results: self.cases
                .filter((row) =>
                  ["dismissed", "suspended", "appealed", "closed"].includes(
                    String(row.status)
                  )
                )
                .map((row) => ({
                  subject_vouch_ids_json: row.subject_vouch_ids_json,
                })) as T[],
            };
          }
          if (sql.includes("FROM vouch_cases") && sql.includes("priority")) {
            return {
              results: self.cases.filter((row) =>
                ["dismissed", "suspended", "appealed", "closed"].includes(
                  String(row.status)
                )
              ) as T[],
            };
          }
          if (sql.includes("FROM vouch_reports") && sql.includes("GROUP BY kind")) {
            return { results: countBy(self.reports, "kind") as T[] };
          }
          return { results: [] as T[] };
        },
        async first<T>() {
          if (sql.includes("COUNT(DISTINCT profile_id)")) {
            return {
              n: new Set(self.suspensions.map((row) => row.profile_id)).size,
            } as T;
          }
          if (sql.includes("FROM vouch_appeals")) {
            return { n: self.appeals.length } as T;
          }
          return { n: 0 } as T;
        },
      };
    }
  }
}

function countBy(rows: TableRow[], key: string): Array<{ key: string; n: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([k, n]) => ({ key: k, n }));
}

const TOKEN = "test-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/vouch-transparency";

describe("vouch transparency counters", () => {
  it("aggregates counters without exporting raw graph/report data", async () => {
    const fake = new FakeTransparencyDb();
    fake.vouches.push(
      {
        voucher_profile_id: "profile_a",
        vouchee_profile_id: "profile_b",
        status: "active",
        created_at: "2026-05-01T00:00:00.000Z",
      },
      {
        voucher_profile_id: "profile_b",
        vouchee_profile_id: "profile_a",
        status: "active",
        created_at: "2026-05-01T01:00:00.000Z",
      },
      {
        vouch_id: "vouch_reviewed",
        voucher_profile_id: "profile_c",
        vouchee_profile_id: "profile_d",
        status: "revoked",
        created_at: "2026-05-02T00:00:00.000Z",
      }
    );
    fake.cases.push(
      {
        kind: "vouch_graph",
        status: "appealed",
        priority: "p0",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T04:00:00.000Z",
        subject_vouch_ids_json: '["vouch_reviewed"]',
      },
      {
        kind: "harassment",
        status: "open",
        priority: "p1",
        created_at: "2026-05-02T00:00:00.000Z",
        updated_at: "2026-05-02T00:00:00.000Z",
        subject_vouch_ids_json: "[]",
      }
    );
    fake.reports.push({ kind: "harassment" }, { kind: "harassment" });
    fake.suspensions.push({ profile_id: "profile_b" }, { profile_id: "profile_b" });
    fake.appeals.push({ appeal_id: "appeal_1" });

    const body = await buildVouchTransparencyCounters(
      fake as unknown as D1Database,
      new Date("2026-06-01T00:00:00.000Z")
    );

    expect(body.current_audit_flags_by_kind.closed_loop_only).toBe(2);
    expect(body.cases_opened_by_kind.vouch_graph).toBe(1);
    expect(body.cases_opened_by_kind.harassment).toBe(1);
    expect(body.cases_closed_by_kind.vouch_graph).toBe(1);
    expect(body.reports_received_by_kind.harassment).toBe(2);
    expect(body.profiles_suspended).toBe(1);
    expect(body.appeals_opened).toBe(1);
    expect(body.vouches_revoked_after_review).toBe(1);
    expect(body.median_review_age_hours_by_priority.p0).toBe(4);
    expect(body.privacy).toEqual({
      raw_graph_exported: false,
      report_statements_exported: false,
      subject_profile_ids_exported: false,
    });
    expect(JSON.stringify(body)).not.toContain("profile_a");
    expect(JSON.stringify(body)).not.toContain("reporter statement");
  });

  it("requires operator auth on the route", async () => {
    const fake = new FakeTransparencyDb();
    const unauthorized = await handleGetVouchTransparency(
      new Request(URL),
      fake as unknown as D1Database,
      TOKEN
    );
    expect(unauthorized.status).toBe(401);

    const ok = await handleGetVouchTransparency(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      fake as unknown as D1Database,
      TOKEN
    );
    expect(ok.status).toBe(200);
  });

  it("dispatches via worker.fetch", async () => {
    const res = await worker.fetch(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      { DB: undefined, OPERATOR_AUDIT_TOKEN: TOKEN },
      {} as ExecutionContext
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "database_unconfigured" });
  });
});

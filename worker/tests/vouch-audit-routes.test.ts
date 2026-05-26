import { describe, expect, it } from "vitest";

import worker from "../src";
import { listVouchAuditFlags } from "../src/db/vouch-audit";
import { handleGetVouchAuditFlags } from "../src/resolver/vouch-audit-flags";

type AuditRow = {
  voucher_profile_id: string;
  vouchee_profile_id: string;
  status: "active" | "revoked";
  created_at: string;
};

class FakeAuditDb {
  constructor(private readonly rows: AuditRow[]) {}

  prepare(_sql: string) {
    const rows = this.rows;
    return {
      bind(_maxRows: number) {
        return {
          async all<T>() {
            return { results: rows as T[] };
          },
        };
      },
    };
  }
}

function db(rows: AuditRow[]): D1Database {
  return new FakeAuditDb(rows) as unknown as D1Database;
}

const TOKEN = "test-operator-audit-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/vouch-audit-flags";

describe("operator vouch audit flags API (M6 Step 4)", () => {
  it("returns 503 when OPERATOR_AUDIT_TOKEN is not configured", async () => {
    const res = await handleGetVouchAuditFlags(
      new Request(URL),
      db([]),
      undefined
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "OPERATOR_AUDIT_UNCONFIGURED" });
  });

  it("returns 401 without Bearer token", async () => {
    const res = await handleGetVouchAuditFlags(new Request(URL), db([]), TOKEN);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("returns 401 with wrong Bearer token", async () => {
    const res = await handleGetVouchAuditFlags(
      new Request(URL, {
        headers: { Authorization: "Bearer wrong-token" },
      }),
      db([]),
      TOKEN
    );
    expect(res.status).toBe(401);
  });

  it("returns flags with triage hints when authorized", async () => {
    const res = await handleGetVouchAuditFlags(
      new Request(URL, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      db([
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
      ]),
      TOKEN
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      flag_count: number;
      playbook: string;
      flags: Array<{ kind: string; triage: { priority: string; threat_ids: string[] } }>;
    };
    expect(body.playbook).toContain("VOUCH_STEWARD_REVIEW_RUNBOOK");
    expect(body.flag_count).toBeGreaterThan(0);
    const loop = body.flags.find((f) => f.kind === "closed_loop_only");
    expect(loop?.triage.priority).toBe("medium");
    expect(loop?.triage.threat_ids).toContain("G-01");
  });

  it("rejects invalid max_rows query", async () => {
    const res = await handleGetVouchAuditFlags(
      new Request(`${URL}?max_rows=99999`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      db([]),
      TOKEN
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "INVALID_QUERY" });
  });

  it("dispatches via worker.fetch when routed", async () => {
    const res = await worker.fetch(
      new Request(URL, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      { DB: undefined, OPERATOR_AUDIT_TOKEN: TOKEN },
      {} as ExecutionContext
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "database_unconfigured" });
  });
});

describe("listVouchAuditFlags integration sanity", () => {
  it("still flags closed loops for handler input", async () => {
    const flags = await listVouchAuditFlags(
      db([
        {
          voucher_profile_id: "x",
          vouchee_profile_id: "y",
          status: "active",
          created_at: "2026-05-01T00:00:00.000Z",
        },
        {
          voucher_profile_id: "y",
          vouchee_profile_id: "x",
          status: "active",
          created_at: "2026-05-01T01:00:00.000Z",
        },
      ])
    );
    expect(flags.some((f) => f.kind === "closed_loop_only")).toBe(true);
  });
});

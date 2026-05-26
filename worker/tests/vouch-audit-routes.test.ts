import { describe, expect, it } from "vitest";

import worker from "../src";
import { listVouchAuditFlags } from "../src/db/vouch-audit";
import {
  handleDeleteVouchAuditFlagDismiss,
  handleGetVouchAuditFlags,
  handlePostVouchAuditFlagDismiss,
} from "../src/resolver/vouch-audit-flags";

type AuditRow = {
  voucher_profile_id: string;
  vouchee_profile_id: string;
  status: "active" | "revoked";
  created_at: string;
};

class FakeAuditDb {
  private dismissals = new Map<
    string,
    {
      flag_key: string;
      flag_kind: "closed_loop_only" | "burst_at_quota_boundary" | "shared_voucher_set";
      note: string;
      dismissed_by: string;
      dismissed_at: string;
      updated_at: string;
    }
  >();

  constructor(private readonly rows: AuditRow[]) {}

  prepare(sql: string) {
    const rows = this.rows;
    const dismissals = this.dismissals;
    return {
      bind(...args: unknown[]) {
        return {
          async all<T>() {
            if (sql.includes("FROM vouches")) {
              return { results: rows as T[] };
            }
            if (sql.includes("FROM vouch_audit_dismissals")) {
              const keys = args as string[];
              const found = keys
                .map((k) => dismissals.get(k))
                .filter((v): v is NonNullable<typeof v> => !!v);
              return { results: found as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_audit_dismissals")) {
              const [flag_key, flag_kind, note, dismissed_by, dismissed_at, updated_at] =
                args as [string, "closed_loop_only" | "burst_at_quota_boundary" | "shared_voucher_set", string, string, string, string];
              dismissals.set(flag_key, {
                flag_key,
                flag_kind,
                note,
                dismissed_by,
                dismissed_at,
                updated_at,
              });
              return { meta: { changes: 1 } };
            }
            if (sql.includes("DELETE FROM vouch_audit_dismissals")) {
              const key = args[0] as string;
              const existed = dismissals.delete(key);
              return { meta: { changes: existed ? 1 : 0 } };
            }
            return { meta: { changes: 0 } };
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
    const fake = db([
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
    ]);

    const res = await handleGetVouchAuditFlags(
      new Request(URL, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      fake,
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
    expect(loop).toHaveProperty("flag_key");
    expect((loop as { dismissal?: unknown }).dismissal ?? null).toBeNull();
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

  it("stores dismissal note and returns it from GET", async () => {
    const fake = db([
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
    ]);

    const first = await handleGetVouchAuditFlags(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      fake,
      TOKEN
    );
    const firstBody = (await first.json()) as {
      flags: Array<{ flag_key: string; kind: "closed_loop_only"; dismissal: unknown }>;
    };
    const target = firstBody.flags.find((f) => f.kind === "closed_loop_only");
    expect(target).toBeTruthy();

    const dismissRes = await handlePostVouchAuditFlagDismiss(
      new Request(`${URL}/dismiss`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flag_key: target!.flag_key,
          flag_kind: "closed_loop_only",
          note: "Known friends; reviewed in person.",
          dismissed_by: "steward-alpha",
        }),
      }),
      fake,
      TOKEN
    );
    expect(dismissRes.status).toBe(200);

    const second = await handleGetVouchAuditFlags(
      new Request(URL, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      fake,
      TOKEN
    );
    const secondBody = (await second.json()) as {
      flags: Array<{
        flag_key: string;
        kind: "closed_loop_only";
        dismissal: { note: string; dismissed_by: string } | null;
      }>;
    };
    const reviewed = secondBody.flags.find((f) => f.flag_key === target!.flag_key);
    expect(reviewed?.dismissal?.note).toContain("Known friends");
    expect(reviewed?.dismissal?.dismissed_by).toBe("steward-alpha");
  });

  it("can clear a dismissal note", async () => {
    const fake = db([]);
    const key = "closed_loop_only|profile_a|profile_b";

    const save = await handlePostVouchAuditFlagDismiss(
      new Request(`${URL}/dismiss`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flag_key: key,
          flag_kind: "closed_loop_only",
          note: "test",
        }),
      }),
      fake,
      TOKEN
    );
    expect(save.status).toBe(200);

    const clear = await handleDeleteVouchAuditFlagDismiss(
      new Request(`${URL}/dismiss`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flag_key: key }),
      }),
      fake,
      TOKEN
    );
    expect(clear.status).toBe(200);
    expect(await clear.json()).toMatchObject({ deleted: true, flag_key: key });
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

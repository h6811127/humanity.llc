import { describe, expect, it } from "vitest";

import worker from "../src";
import { listVouchAuditFlags } from "../src/db/vouch-audit";
import { vouchAuditFlagKey } from "../src/db/vouch-audit-review";
import type { VouchCaseRow } from "../src/db/vouch-cases";
import {
  handleGetVouchCases,
  handlePostVouchCase,
  handlePostVouchCaseSuspend,
} from "../src/resolver/vouch-cases";

type AuditRow = {
  voucher_profile_id: string;
  vouchee_profile_id: string;
  status: "active" | "revoked";
  created_at: string;
};

class FakeVouchCaseDb {
  private cases: VouchCaseRow[] = [];
  private cards = new Map<string, { profile_id: string; status: string; updated_at: string }>();
  private suspensions: Array<{
    suspension_id: string;
    case_id: string;
    profile_id: string;
    status: "suspended";
    public_label: string;
    cause_category: string;
    notice: string;
    appeal_deadline: string;
    signed_document_json: string | null;
    suspended_by: string;
    suspended_at: string;
    created_at: string;
  }> = [];

  constructor(
    private readonly rows: AuditRow[],
    private readonly stewards: string[] = []
  ) {}

  addCard(profileId: string, status = "active") {
    this.cards.set(profileId, {
      profile_id: profileId,
      status,
      updated_at: "2026-05-01T00:00:00.000Z",
    });
  }

  cardStatus(profileId: string): string | undefined {
    return this.cards.get(profileId)?.status;
  }

  prepare(sql: string) {
    const rows = this.rows;
    const stewards = this.stewards;
    const cases = this.cases;
    const cards = this.cards;
    const suspensions = this.suspensions;
    return {
      bind(...args: unknown[]) {
        return {
          async all<T>() {
            if (sql.includes("FROM verification_summaries")) {
              const requested = new Set(args as string[]);
              const results = stewards
                .filter((profile_id) => requested.has(profile_id))
                .map((profile_id) => ({ profile_id }));
              return { results: results as T[] };
            }
            if (sql.includes("FROM vouches")) {
              return { results: rows as T[] };
            }
            if (sql.includes("FROM vouch_cases")) {
              const limit = Number(args[args.length - 1] ?? 100);
              let result = [...cases];
              if (sql.includes("WHERE status = ? AND source = ?")) {
                result = result.filter(
                  (row) => row.status === args[0] && row.source === args[1]
                );
              } else if (sql.includes("WHERE status = ?")) {
                result = result.filter((row) => row.status === args[0]);
              } else if (sql.includes("WHERE source = ?")) {
                result = result.filter((row) => row.source === args[0]);
              }
              result.sort(
                (a, b) =>
                  b.updated_at.localeCompare(a.updated_at) ||
                  b.case_id.localeCompare(a.case_id)
              );
              return { results: result.slice(0, limit) as T[] };
            }
            return { results: [] as T[] };
          },
          async first<T>() {
            if (
              sql.includes("FROM vouch_case_suspensions") &&
              sql.includes("suspension_id = ?")
            ) {
              return (
                suspensions.find((row) => row.suspension_id === args[0]) ?? null
              ) as T | null;
            }
            if (sql.includes("FROM vouch_cases") && sql.includes("case_id = ?")) {
              return (cases.find((row) => row.case_id === args[0]) ?? null) as T | null;
            }
            if (
              sql.includes("FROM vouch_cases") &&
              sql.includes("source = ?") &&
              sql.includes("source_key = ?")
            ) {
              const [source, sourceKey, ...statuses] = args as string[];
              return (
                cases.find(
                  (row) =>
                    row.source === source &&
                    row.source_key === sourceKey &&
                    statuses.includes(row.status)
                ) ?? null
              ) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_case_suspensions")) {
              const [
                suspension_id,
                case_id,
                profile_id,
                cause_category,
                notice,
                appeal_deadline,
                signed_document_json,
                suspended_by,
                suspended_at,
                created_at,
              ] = args as string[];
              suspensions.push({
                suspension_id,
                case_id,
                profile_id,
                status: "suspended",
                public_label: "Suspended under public rules",
                cause_category,
                notice,
                appeal_deadline,
                signed_document_json: signed_document_json ?? null,
                suspended_by,
                suspended_at,
                created_at,
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO vouch_cases")) {
              const [
                case_id,
                kind,
                source,
                source_key,
                subject_profile_ids_json,
                subject_vouch_ids_json,
                status,
                priority,
                threat_ids_json,
                summary,
                created_by,
                assigned_to,
                created_at,
                updated_at,
              ] = args as string[];
              cases.push({
                case_id,
                kind: kind as VouchCaseRow["kind"],
                source: source as VouchCaseRow["source"],
                source_key,
                subject_profile_ids_json,
                subject_vouch_ids_json,
                status: status as VouchCaseRow["status"],
                priority: priority as VouchCaseRow["priority"],
                threat_ids_json,
                summary,
                created_by,
                assigned_to: assigned_to ?? null,
                created_at,
                updated_at,
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE cards") && sql.includes("status = 'suspended'")) {
              const [updated_at, profile_id] = args as string[];
              const card = cards.get(profile_id);
              if (!card) return { success: true, meta: { changes: 0 } };
              card.status = "suspended";
              card.updated_at = updated_at;
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE vouch_cases") && sql.includes("status = 'suspended'")) {
              const [updated_at, case_id] = args as string[];
              const found = cases.find((row) => row.case_id === case_id);
              if (!found) return { success: true, meta: { changes: 0 } };
              found.status = "suspended";
              found.updated_at = updated_at;
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(rows: AuditRow[], stewards: string[] = []): D1Database {
  return new FakeVouchCaseDb(rows, stewards) as unknown as D1Database;
}

const TOKEN = "test-operator-audit-token";
const URL = "https://humanity.llc/.well-known/hc/v1/operator/vouch-cases";

function closedLoopRows(): AuditRow[] {
  return [
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
  ];
}

describe("operator vouch cases API", () => {
  it("requires OPERATOR_AUDIT_TOKEN configuration and Bearer auth", async () => {
    const unconfigured = await handleGetVouchCases(new Request(URL), db([]), undefined);
    expect(unconfigured.status).toBe(503);

    const unauthorized = await handleGetVouchCases(new Request(URL), db([]), TOKEN);
    expect(unauthorized.status).toBe(401);
  });

  it("converts a current audit flag into a durable case", async () => {
    const fake = db(closedLoopRows());
    const flags = await listVouchAuditFlags(fake);
    const loop = flags.find((flag) => flag.kind === "closed_loop_only");
    expect(loop).toBeTruthy();
    const flagKey = vouchAuditFlagKey(loop!);

    const res = await handlePostVouchCase(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "audit_flag",
          flag_key: flagKey,
          created_by: "steward-alpha",
        }),
      }),
      fake,
      TOKEN
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      created: boolean;
      case: {
        case_id: string;
        kind: string;
        source: string;
        source_key: string;
        subject_profile_ids: string[];
        priority: string;
        threat_ids: string[];
        created_by: string;
      };
    };
    expect(body.created).toBe(true);
    expect(body.case.case_id).toMatch(/^case_/);
    expect(body.case.kind).toBe("vouch_graph");
    expect(body.case.source).toBe("audit_flag");
    expect(body.case.source_key).toBe(flagKey);
    expect(body.case.subject_profile_ids).toEqual(["profile_a", "profile_b"]);
    expect(body.case.priority).toBe("p1");
    expect(body.case.threat_ids).toContain("G-01");
    expect(body.case.created_by).toBe("steward-alpha");
  });

  it("dedupes repeated open cases for the same audit flag", async () => {
    const fake = db(closedLoopRows());
    const loop = (await listVouchAuditFlags(fake)).find(
      (flag) => flag.kind === "closed_loop_only"
    );
    const flagKey = vouchAuditFlagKey(loop!);
    const requestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "audit_flag", flag_key: flagKey }),
    };

    const first = await handlePostVouchCase(new Request(URL, requestInit), fake, TOKEN);
    const second = await handlePostVouchCase(new Request(URL, requestInit), fake, TOKEN);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { created: boolean };
    expect(secondBody.created).toBe(false);
  });

  it("creates and lists a manual operator case", async () => {
    const fake = db([]);
    const create = await handlePostVouchCase(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "operator_manual",
          source_key: "manual-report-1",
          kind: "false_vouch",
          subject_profile_ids: ["profile_z", "profile_z"],
          subject_vouch_ids: ["vouch_1"],
          priority: "p0",
          threat_ids: ["H-02"],
          summary: "Reporter says this vouch was mistaken.",
          assigned_to: "steward-beta",
        }),
      }),
      fake,
      TOKEN
    );
    expect(create.status).toBe(201);

    const list = await handleGetVouchCases(
      new Request(`${URL}?source=operator_manual`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
      fake,
      TOKEN
    );
    expect(list.status).toBe(200);
    const body = (await list.json()) as {
      case_count: number;
      cases: Array<{
        source_key: string;
        subject_profile_ids: string[];
        assigned_to: string;
      }>;
    };
    expect(body.case_count).toBe(1);
    expect(body.cases[0]?.source_key).toBe("manual-report-1");
    expect(body.cases[0]?.subject_profile_ids).toEqual(["profile_z"]);
    expect(body.cases[0]?.assigned_to).toBe("steward-beta");
  });

  it("suspends a case subject and marks the case suspended", async () => {
    const fake = new FakeVouchCaseDb([]);
    fake.addCard("profile_z");
    const create = await handlePostVouchCase(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "operator_manual",
          source_key: "manual-suspend-1",
          kind: "false_vouch",
          subject_profile_ids: ["profile_z"],
          priority: "p0",
          threat_ids: ["H-02"],
          summary: "Confirmed false vouch escalation.",
        }),
      }),
      fake as unknown as D1Database,
      TOKEN
    );
    const created = (await create.json()) as { case: { case_id: string } };

    const suspend = await handlePostVouchCaseSuspend(
      new Request(`${URL}/${created.case.case_id}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: "profile_z",
          cause_category: "vouch_abuse",
          notice: "Suspended under public rules pending appeal.",
          appeal_deadline: "2026-06-30T00:00:00.000Z",
          suspended_by: "steward-alpha",
        }),
      }),
      fake as unknown as D1Database,
      TOKEN,
      created.case.case_id
    );

    expect(suspend.status).toBe(200);
    const body = (await suspend.json()) as {
      suspension: {
        profile_id: string;
        status: string;
        public_label: string;
        cause_category: string;
        notice: string;
        appeal_deadline: string;
      };
      case: { status: string };
    };
    expect(body.suspension).toMatchObject({
      profile_id: "profile_z",
      status: "suspended",
      public_label: "Suspended under public rules",
      cause_category: "vouch_abuse",
      notice: "Suspended under public rules pending appeal.",
      appeal_deadline: "2026-06-30T00:00:00.000Z",
    });
    expect(body.case.status).toBe("suspended");
    expect(fake.cardStatus("profile_z")).toBe("suspended");
  });

  it("rejects suspension for profiles outside the case subjects", async () => {
    const fake = new FakeVouchCaseDb([]);
    fake.addCard("profile_z");
    fake.addCard("profile_other");
    const create = await handlePostVouchCase(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "operator_manual",
          source_key: "manual-suspend-2",
          kind: "false_vouch",
          subject_profile_ids: ["profile_z"],
          summary: "Confirmed false vouch escalation.",
        }),
      }),
      fake as unknown as D1Database,
      TOKEN
    );
    const created = (await create.json()) as { case: { case_id: string } };

    const suspend = await handlePostVouchCaseSuspend(
      new Request(`${URL}/${created.case.case_id}/suspend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: "profile_other",
          cause_category: "vouch_abuse",
          notice: "Suspended under public rules pending appeal.",
          appeal_deadline: "2026-06-30T00:00:00.000Z",
        }),
      }),
      fake as unknown as D1Database,
      TOKEN,
      created.case.case_id
    );

    expect(suspend.status).toBe(409);
    expect(await suspend.json()).toMatchObject({ error: "PROFILE_NOT_IN_CASE" });
    expect(fake.cardStatus("profile_other")).toBe("active");
  });

  it("rejects malformed manual cases", async () => {
    const res = await handlePostVouchCase(
      new Request(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "operator_manual",
          kind: "false_vouch",
          subject_profile_ids: [],
          summary: "Missing subject",
        }),
      }),
      db([]),
      TOKEN
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "INVALID_SUBJECT_PROFILES" });
  });

  it("dispatches vouch cases through worker.fetch", async () => {
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

import { describe, expect, it } from "vitest";

import type { VouchCaseRow } from "../src/db/vouch-cases";
import type { VouchReportRow } from "../src/db/vouch-reports";
import { handlePostVouchReport } from "../src/resolver/vouch-reports";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

const URL = "https://humanity.llc/.well-known/hc/v1/vouch-reports";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const VOUCH_ID = "vouch_testreport123456789";

class FakeVouchReportDb {
  private cases: VouchCaseRow[] = [];
  private reports: VouchReportRow[] = [];
  private cards = new Map<string, { profile_id: string }>();
  private vouches = new Map<
    string,
    { vouch_id: string; voucher_profile_id: string; vouchee_profile_id: string }
  >();
  readonly rateLimits = new RateLimitBucketStore();

  addCard(profileId: string) {
    this.cards.set(profileId, { profile_id: profileId });
  }

  addVouch(vouchId: string, voucherProfileId: string, voucheeProfileId: string) {
    this.vouches.set(vouchId, {
      vouch_id: vouchId,
      voucher_profile_id: voucherProfileId,
      vouchee_profile_id: voucheeProfileId,
    });
  }

  prepare(sql: string) {
    if (sql.includes("rate_limit_buckets")) {
      return this.rateLimits.prepare(sql);
    }
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              const profileId = args[0] as string;
              return (self.cards.has(profileId) ? { card_document_json: "{}" } : null) as T | null;
            }
            if (sql.includes("FROM vouches WHERE vouch_id")) {
              return (self.vouches.get(args[0] as string) ?? null) as T | null;
            }
            if (sql.includes("FROM vouch_cases") && sql.includes("source = ?")) {
              const source = args[0] as string;
              const sourceKey = args[1] as string;
              const openStatuses = new Set([
                "open",
                "watching",
                "action_required",
                "appealed",
                "suspended",
              ]);
              const row = [...self.cases]
                .reverse()
                .find(
                  (item) =>
                    item.source === source &&
                    item.source_key === sourceKey &&
                    openStatuses.has(item.status)
                );
              return (row ?? null) as T | null;
            }
            if (sql.includes("FROM vouch_cases WHERE case_id")) {
              return (self.cases.find((row) => row.case_id === args[0]) ?? null) as T | null;
            }
            if (sql.includes("FROM vouch_reports WHERE report_id")) {
              return (self.reports.find((row) => row.report_id === args[0]) ?? null) as T | null;
            }
            return null;
          },
          async all<T>() {
            if (sql.includes("FROM vouch_cases")) {
              return { results: [...self.cases] as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO vouch_cases")) {
              const row: VouchCaseRow = {
                case_id: args[0] as string,
                kind: args[1] as VouchCaseRow["kind"],
                source: args[2] as VouchCaseRow["source"],
                source_key: args[3] as string,
                subject_profile_ids_json: args[4] as string,
                subject_vouch_ids_json: args[5] as string,
                status: (args[6] as VouchCaseRow["status"]) ?? "open",
                priority: args[7] as VouchCaseRow["priority"],
                threat_ids_json: args[8] as string,
                summary: args[9] as string,
                created_by: args[10] as string,
                assigned_to: (args[11] as string | null) ?? null,
                created_at: args[12] as string,
                updated_at: args[13] as string,
              };
              self.cases.push(row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO vouch_reports")) {
              const row: VouchReportRow = {
                report_id: args[0] as string,
                reference_code: (args[1] as string | null) ?? null,
                kind: args[2] as VouchReportRow["kind"],
                target_raw: args[3] as string,
                target_profile_id: (args[4] as string | null) ?? null,
                target_vouch_id: (args[5] as string | null) ?? null,
                target_scan_url: (args[6] as string | null) ?? null,
                statement: args[7] as string,
                contact_method: (args[8] as string | null) ?? null,
                case_id: args[9] as string,
                created_at: args[10] as string,
              };
              self.reports.push(row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: false, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe("POST vouch-reports", () => {
  it("creates a public report, case, and reference code when contact is provided", async () => {
    const fake = new FakeVouchReportDb();
    fake.addCard(PROFILE);

    const res = await handlePostVouchReport(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.10",
        },
        body: JSON.stringify({
          kind: "false_vouch",
          target: `https://humanity.llc/c/${PROFILE}?q=qr_test1234567890`,
          statement: "This vouch is false — we never met.",
          contact_method: "reporter@example.com",
        }),
      }),
      fake as unknown as D1Database
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      report_id: string;
      reference_code: string | null;
      case_created: boolean;
      case: { source: string; kind: string; subject_profile_ids: string[] };
    };
    expect(body.report_id).toMatch(/^report_/);
    expect(body.reference_code).toMatch(/^vrr_/);
    expect(body.case_created).toBe(true);
    expect(body.case.source).toBe("public_report");
    expect(body.case.kind).toBe("false_vouch");
    expect(body.case.subject_profile_ids).toEqual([PROFILE]);
    expect(fake.reports).toHaveLength(1);
  });

  it("attaches a second report to an open case for the same profile and kind", async () => {
    const fake = new FakeVouchReportDb();
    fake.addCard(PROFILE);

    const first = await handlePostVouchReport(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.11",
        },
        body: JSON.stringify({
          kind: "harassment",
          target: PROFILE,
          statement: "First report.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { case: { case_id: string }; case_created: boolean };
    expect(firstBody.case_created).toBe(true);

    const second = await handlePostVouchReport(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.12",
        },
        body: JSON.stringify({
          kind: "harassment",
          target: PROFILE,
          statement: "Second report with more detail.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(second.status).toBe(201);
    const secondBody = (await second.json()) as {
      case: { case_id: string };
      case_created: boolean;
      reference_code: string | null;
    };
    expect(secondBody.case_created).toBe(false);
    expect(secondBody.case.case_id).toBe(firstBody.case.case_id);
    expect(secondBody.reference_code).toBeNull();
    expect(fake.reports).toHaveLength(2);
  });

  it("resolves vouch id targets to both profiles", async () => {
    const fake = new FakeVouchReportDb();
    fake.addCard(PROFILE);
    fake.addCard("8Ym8nQ3pR5sU7wX9zA2bC4dE6");
    fake.addVouch(VOUCH_ID, PROFILE, "8Ym8nQ3pR5sU7wX9zA2bC4dE6");

    const res = await handlePostVouchReport(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.13",
        },
        body: JSON.stringify({
          kind: "statement_abuse",
          target: VOUCH_ID,
          statement: "The public statement is abusive.",
        }),
      }),
      fake as unknown as D1Database
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      case: { subject_profile_ids: string[]; subject_vouch_ids: string[] };
    };
    expect(body.case.subject_vouch_ids).toEqual([VOUCH_ID]);
    expect(body.case.subject_profile_ids.sort()).toEqual(
      [PROFILE, "8Ym8nQ3pR5sU7wX9zA2bC4dE6"].sort()
    );
  });

  it("returns 429 when rate limited", async () => {
    const fake = new FakeVouchReportDb();
    fake.addCard(PROFILE);

    for (let i = 0; i < 10; i += 1) {
      const ok = await handlePostVouchReport(
        new Request(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "203.0.113.99",
          },
          body: JSON.stringify({
            kind: "false_vouch",
            target: PROFILE,
            statement: `Report ${i}`,
          }),
        }),
        fake as unknown as D1Database
      );
      expect(ok.status).toBe(201);
    }

    const blocked = await handlePostVouchReport(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.99",
        },
        body: JSON.stringify({
          kind: "false_vouch",
          target: PROFILE,
          statement: "One too many",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(blocked.status).toBe(429);
  });
});

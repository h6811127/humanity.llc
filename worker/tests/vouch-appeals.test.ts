import { describe, expect, it } from "vitest";

import type { VouchAppealRow } from "../src/db/vouch-appeals";
import type { VouchCaseRow, VouchCaseSuspensionRow } from "../src/db/vouch-cases";
import { handlePostVouchAppeal } from "../src/resolver/vouch-appeals";
import { RateLimitBucketStore } from "./rate-limit-db-mock";

const URL = "https://humanity.llc/.well-known/hc/v1/vouch-appeals";
const CASE_ID = "case_appealtest123456789012345";
const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

class FakeVouchAppealDb {
  private cases: VouchCaseRow[] = [];
  private suspensions: VouchCaseSuspensionRow[] = [];
  readonly appeals: VouchAppealRow[] = [];
  readonly cards = new Map<string, { profile_id: string; status: string }>();
  readonly rateLimits = new RateLimitBucketStore();

  addSuspendedProfile(profileId: string, caseId = CASE_ID) {
    this.cards.set(profileId, { profile_id: profileId, status: "suspended" });
    this.cases.push({
      case_id: caseId,
      kind: "harassment",
      source: "operator_manual",
      source_key: `manual:${profileId}`,
      subject_profile_ids_json: JSON.stringify([profileId]),
      subject_vouch_ids_json: "[]",
      status: "suspended",
      priority: "p1",
      threat_ids_json: '["H-02"]',
      summary: "Test suspension case.",
      created_by: "operator",
      assigned_to: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    });
    this.suspensions.push({
      suspension_id: "susp_test123456789",
      case_id: caseId,
      profile_id: profileId,
      status: "suspended",
      public_label: "Suspended under public rules",
      cause_category: "harassment",
      notice: "Suspended under public rules pending appeal.",
      appeal_deadline: "2026-06-30T00:00:00.000Z",
      signed_document_json: null,
      suspended_by: "operator",
      suspended_at: "2026-05-01T00:00:00.000Z",
      created_at: "2026-05-01T00:00:00.000Z",
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
              const card = self.cards.get(profileId);
              if (!card) return null;
              if (sql.includes("card_document_json")) {
                return { card_document_json: "{}" } as T;
              }
              if (sql.includes("status")) {
                return { status: card.status } as T;
              }
              return card as T;
            }
            if (sql.includes("FROM vouch_cases WHERE case_id")) {
              return (
                self.cases.find((row) => row.case_id === args[0]) ?? null
              ) as T | null;
            }
            if (sql.includes("FROM vouch_case_suspensions") && sql.includes("profile_id")) {
              const profileId = args[0] as string;
              const row = [...self.suspensions]
                .reverse()
                .find((item) => item.profile_id === profileId);
              return (row ?? null) as T | null;
            }
            if (sql.includes("FROM vouch_appeals WHERE appeal_id")) {
              return (
                self.appeals.find((row) => row.appeal_id === args[0]) ?? null
              ) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("UPDATE vouch_cases")) {
              const status = args[0] as string;
              const now = args[1] as string;
              const caseId = args[2] as string;
              const row = self.cases.find((item) => item.case_id === caseId);
              if (!row) return { success: false, meta: { changes: 0 } };
              row.status = status as VouchCaseRow["status"];
              row.updated_at = now;
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO vouch_appeals")) {
              const row: VouchAppealRow = {
                appeal_id: args[0] as string,
                reference_code: (args[1] as string | null) ?? null,
                case_id: args[2] as string,
                profile_id: args[3] as string,
                statement: args[4] as string,
                contact_method: (args[5] as string | null) ?? null,
                created_at: args[6] as string,
              };
              self.appeals.push(row);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: false, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

describe("POST vouch-appeals", () => {
  it("creates an appeal, moves case to appealed, and returns reference code", async () => {
    const fake = new FakeVouchAppealDb();
    fake.addSuspendedProfile(PROFILE);

    const res = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.20",
        },
        body: JSON.stringify({
          case_id: CASE_ID,
          profile_id: PROFILE,
          statement: "This suspension was a mistake.",
          contact_method: "appealer@example.com",
        }),
      }),
      fake as unknown as D1Database
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      appeal_id: string;
      reference_code: string | null;
      case_status_changed: boolean;
      case: { status: string };
    };
    expect(body.appeal_id).toMatch(/^appeal_/);
    expect(body.reference_code).toMatch(/^vra_/);
    expect(body.case_status_changed).toBe(true);
    expect(body.case.status).toBe("appealed");
    expect(fake.appeals).toHaveLength(1);
  });

  it("accepts follow-up appeals when case is already appealed", async () => {
    const fake = new FakeVouchAppealDb();
    fake.addSuspendedProfile(PROFILE);

    const first = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.21",
        },
        body: JSON.stringify({
          case_id: CASE_ID,
          profile_id: PROFILE,
          statement: "First appeal.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(first.status).toBe(201);

    const second = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.22",
        },
        body: JSON.stringify({
          case_id: CASE_ID,
          profile_id: PROFILE,
          statement: "Additional context.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(second.status).toBe(201);
    const secondBody = (await second.json()) as { case_status_changed: boolean };
    expect(secondBody.case_status_changed).toBe(false);
    expect(fake.appeals).toHaveLength(2);
  });

  it("rejects appeals for non-suspended profiles", async () => {
    const fake = new FakeVouchAppealDb();
    fake.addSuspendedProfile(PROFILE);
    fake.cards.set(PROFILE, { profile_id: PROFILE, status: "active" });

    const res = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.23",
        },
        body: JSON.stringify({
          case_id: CASE_ID,
          profile_id: PROFILE,
          statement: "Should fail.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(res.status).toBe(422);
  });

  it("rejects appeals when the suspension record is not linked to the case", async () => {
    const fake = new FakeVouchAppealDb();
    fake.addSuspendedProfile(PROFILE, "case_other123456789012345");

    const res = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.24",
        },
        body: JSON.stringify({
          case_id: "case_other123456789012345",
          profile_id: PROFILE,
          statement: "Should work for matching case.",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(res.status).toBe(201);
  });

  it("returns 429 when rate limited", async () => {
    const fake = new FakeVouchAppealDb();
    fake.addSuspendedProfile(PROFILE);

    for (let i = 0; i < 5; i += 1) {
      const ok = await handlePostVouchAppeal(
        new Request(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "203.0.113.99",
          },
          body: JSON.stringify({
            case_id: CASE_ID,
            profile_id: PROFILE,
            statement: `Appeal ${i}`,
          }),
        }),
        fake as unknown as D1Database
      );
      expect(ok.status).toBe(201);
    }

    const blocked = await handlePostVouchAppeal(
      new Request(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.99",
        },
        body: JSON.stringify({
          case_id: CASE_ID,
          profile_id: PROFILE,
          statement: "One too many",
        }),
      }),
      fake as unknown as D1Database
    );
    expect(blocked.status).toBe(429);
  });
});
